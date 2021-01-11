from sklearn.neighbors import BallTree
import numpy as np
import pandas as pd
from PIL import ImageColor
import json
import os
import io
from pathlib import Path
from ome_types import from_xml
from cycif_viewer import config_json_path
from cycif_viewer.server.utils import pyramid_assemble
import matplotlib.path as mpltPath
from cycif_viewer.server.utils import smallestenclosingcircle
from cycif_viewer.server.models import database_model

import time
import pickle
import tifffile as tf
import re
import zarr
from scipy import spatial

ball_tree = None
datasource = None
source = None
config = None
seg = None
channels = None
metadata = None


def init(datasource_name):
    load_ball_tree(datasource_name)


def load_datasource(datasource_name, reload=False):
    global datasource
    global source
    global config
    global seg
    global channels
    global metadata
    if source is datasource_name and datasource is not None and reload is False:
        return
    load_config()
    if reload:
        load_ball_tree(datasource_name, reload=reload)
    csvPath = "." + config[datasource_name]['featureData'][0]['src']
    datasource = pd.read_csv(csvPath)
    embedding = np.load(Path("." + config[datasource_name]['embedding']))
    datasource['id'] = datasource.index
    datasource['Cluster'] = embedding[:, 2].astype('int32').tolist()
    datasource = datasource.replace(-np.Inf, 0)
    source = datasource_name
    if config[datasource_name]['segmentation'].endswith('.zarr'):
        seg = zarr.load(config[datasource_name]['segmentation'])
    else:
        seg_io = tf.TiffFile(config[datasource_name]['segmentation'], is_ome=False)
        seg = zarr.open(seg_io.series[0].aszarr())
    channel_io = tf.TiffFile(config[datasource_name]['channelFile'], is_ome=False)
    try:
        xml = channel_io.pages[0].tags['ImageDescription'].value
        metadata = from_xml(xml).images[0].pixels
    except:
        metadata = {}
    channels = zarr.open(channel_io.series[0].aszarr())
    init_clusters(datasource_name)


def init_clusters(datasource_name):
    global datasource
    global source
    # Select Cluster Stats
    clusters = np.sort(datasource['Cluster'].unique().tolist())
    for cluster in clusters:
        # Check if the Cluster is in the DB
        neighborhood = database_model.get(database_model.Neighborhood, datasource=datasource_name, is_cluster=True,
                                          name="Cluster " + str(cluster))
        cluster_cells = None
        # If it's not in the Neighborhood database then create and add it
        if neighborhood is None:
            cluster_cells = datasource.loc[datasource['Cluster'] == cluster]
            indices = np.array(cluster_cells.index.values.tolist())
            f = io.BytesIO()
            np.save(f, indices)
            neighborhood = database_model.create(database_model.Neighborhood, cluster_id=int(cluster),
                                                 datasource=datasource_name,
                                                 is_cluster=True,
                                                 name="Cluster " + str(cluster), cells=f.getvalue())

        else:
            indices = np.load(io.BytesIO(neighborhood.cells))
            cluster_cells = None

        neighborhood_stats = database_model.get(database_model.NeighborhoodStats, neighborhood=neighborhood)

        # Similarly, if the stats are not initialized, let's store them in the DB as well
        if neighborhood_stats is None:
            obj = get_neighborhood_stats(indices, cluster_cells)
            f = io.BytesIO()
            pickle.dump(obj, f)
            neighborhood_stats = database_model.create(database_model.NeighborhoodStats, datasource=datasource_name,
                                                       is_cluster=True,
                                                       name="ClusterStats " + str(cluster), stats=f.getvalue(),
                                                       neighborhood=neighborhood)


def get_cluster_cells(datasource_name):
    global datasource
    global source
    clusters = datasource['Cluster'].unique().tolist()
    obj = {}
    for cluster in clusters:
        # Check if the Cluster is in the DB
        neighborhood = database_model.get(database_model.Neighborhood, datasource=datasource_name,
                                          cluster_id=int(cluster))
        neighborhood_stats = database_model.get(database_model.NeighborhoodStats, neighborhood=neighborhood)
        obj[str(cluster)] = pickle.load(io.BytesIO(neighborhood_stats.stats))
    return obj


def get_neighborhood_list(datasource_name):
    neighborhoods = database_model.get_all(database_model.Neighborhood, datasource=datasource_name)
    return [(neighborhood.id, neighborhood.cluster_id, neighborhood.name, neighborhood.is_cluster) for neighborhood in
            neighborhoods]


def edit_neighborhood(elem, datasource_name):
    database_model.edit(database_model.Neighborhood, elem['id'], elem['editField'], elem['editValue'])
    new_neighborhoods = database_model.get_all(database_model.Neighborhood, datasource=datasource_name)
    return [(neighborhood.id, neighborhood.cluster_id, neighborhood.name, neighborhood.is_cluster) for neighborhood in
            new_neighborhoods]


def get_neighborhood(elem, datasource_name):
    neighborhood = database_model.get(database_model.Neighborhood, id=elem['id'], datasource=datasource_name)
    neighborhood_stats = database_model.get(database_model.NeighborhoodStats, neighborhood=neighborhood,
                                            datasource=datasource_name)
    return pickle.load(io.BytesIO(neighborhood_stats.stats))


def get_all_neighborhood_stats(datasource_name):
    def get_stats(neighborhood):
        neighborhood_stats = database_model.get(database_model.NeighborhoodStats, neighborhood=neighborhood,
                                                datasource=datasource_name)
        stats = pickle.load(io.BytesIO(neighborhood_stats.stats))
        stats['neighborhood_id'] = neighborhood_stats.neighborhood_id
        stats['name'] = neighborhood_stats.name
        return stats

    neighborhoods = database_model.get_all(database_model.Neighborhood, datasource=datasource_name)
    obj = [get_stats(neighborhood) for neighborhood in neighborhoods]
    return obj


def save_neighborhood(selection, datasource_name, is_cluster=True):
    existing_neighborhoods = database_model.get_all(database_model.Neighborhood, datasource=datasource_name)
    max_cluster_id = existing_neighborhoods[-1].cluster_id
    indices = np.array([e['id'] for e in selection['cells']])
    f = io.BytesIO()
    np.save(f, indices)
    neighborhood = database_model.create(database_model.Neighborhood, cluster_id=max_cluster_id + 1,
                                         datasource=datasource_name,
                                         is_cluster=is_cluster,
                                         name="", cells=f.getvalue())
    f = io.BytesIO()
    pickle.dump(selection, f)
    database_model.create(database_model.NeighborhoodStats, datasource=datasource_name,
                          is_cluster=is_cluster,
                          name="", stats=f.getvalue(),
                          neighborhood=neighborhood)
    return get_neighborhood_list(datasource_name)


def delete_neighborhood(elem, datasource_name):
    database_model.edit(database_model.Neighborhood, elem['id'], 'is_deleted', True)
    new_neighborhoods = database_model.get_all(database_model.Neighborhood, datasource=datasource_name)
    print('Count', len(new_neighborhoods))
    return [(neighborhood.id, neighborhood.cluster_id, neighborhood.name, neighborhood.is_cluster) for neighborhood in
            new_neighborhoods]


def load_config():
    global config
    with open(config_json_path, "r+") as configJson:
        config = json.load(configJson)


def load_ball_tree(datasource_name_name, reload=False):
    global ball_tree
    global datasource
    global config
    if datasource_name_name != source:
        load_datasource(datasource_name_name)
    pickled_kd_tree_path = str(
        Path(
            os.path.join(os.getcwd())) / "cycif_viewer" / "data" / datasource_name_name / "ball_tree.pickle")
    if os.path.isfile(pickled_kd_tree_path) and reload is False:
        print("Pickled KD Tree Exists, Loading")
        ball_tree = pickle.load(open(pickled_kd_tree_path, "rb"))
    else:
        print("Creating KD Tree")
        xCoordinate = config[datasource_name_name]['featureData'][0]['xCoordinate']
        yCoordinate = config[datasource_name_name]['featureData'][0]['yCoordinate']
        csvPath = "." + config[datasource_name_name]['featureData'][0]['src']
        raw_data = pd.read_csv(csvPath)
        points = pd.DataFrame({'x': raw_data[xCoordinate], 'y': raw_data[yCoordinate]})
        ball_tree = BallTree(points, metric='euclidean')
        pickle.dump(ball_tree, open(pickled_kd_tree_path, 'wb'))


def query_for_closest_cell(x, y, datasource_name):
    global datasource
    global source
    global ball_tree
    if datasource_name != source:
        load_ball_tree(datasource_name)
    distance, index = ball_tree.query([[x, y]], k=1)
    if distance == np.inf:
        return {}
    #         Nothing found
    else:
        try:
            row = datasource.iloc[index[0]]
            obj = row.to_dict(orient='records')[0]
            if 'phenotype' not in obj:
                obj['phenotype'] = ''
            return obj
        except:
            return {}


def get_cells(elem, datasource_name):
    global datasource
    global source
    global config
    fields = [config[datasource_name]['featureData'][0]['xCoordinate'],
              config[datasource_name]['featureData'][0]['yCoordinate'], 'phenotype', 'id']
    ids = elem['ids']
    obj = get_neighborhood_stats(ids, fields=fields)
    return obj


def get_channel_names(datasource_name, shortnames=True):
    global datasource
    global source
    if datasource_name != source:
        load_ball_tree(datasource_name)
    if shortnames:
        channel_names = [channel['name'] for channel in config[datasource_name]['imageData'][1:]]
    else:
        channel_names = [channel['fullname'] for channel in config[datasource_name]['imageData'][1:]]
    return channel_names


def get_channel_cells(datasource_name, channels):
    global datasource
    global source
    global ball_tree

    range = [0, 65536]

    # Load if not loaded
    if datasource_name != source:
        load_ball_tree(datasource_name)

    query_string = ''
    for c in channels:
        if query_string != '':
            query_string += ' and '
        query_string += str(range[0]) + ' < ' + c + ' < ' + str(range[1])
    if query_string == None or query_string == "":
        return []
    query = datasource.query(query_string)[['id']].to_dict(orient='records')
    return query


def get_phenotypes(datasource_name):
    global datasource
    global source
    global config
    try:
        phenotype_field = config[datasource_name]['featureData'][0]['phenotype']
    except KeyError:
        phenotype_field = 'phenotype'
    except TypeError:
        phenotype_field = 'phenotype'

    if datasource_name != source:
        load_ball_tree(datasource_name)
    if phenotype_field in datasource.columns:
        return sorted(datasource[phenotype_field].unique().tolist())
    else:
        return ['']


def get_individual_neighborhood(x, y, datasource_name, r=100, fields=None):
    global datasource
    global source
    global ball_tree
    if datasource_name != source:
        load_ball_tree(datasource_name)
    index = ball_tree.query_radius([[x, y]], r=r)
    neighbors = index[0]
    try:
        if fields and len(fields) > 0:
            fields.append('id') if 'id' not in fields else fields
            if len(fields) > 1:
                neighborhood = datasource.iloc[neighbors][fields].to_dict(orient='records')
            else:
                neighborhood = datasource.iloc[neighbors][fields].to_dict()
        else:
            neighborhood = datasource.iloc[neighbors].to_dict(orient='records')

        return neighborhood
    except:
        return {}


def get_number_of_cells_in_circle(x, y, datasource_name, r):
    global source
    global ball_tree
    if datasource_name != source:
        load_ball_tree(datasource_name)
    index = ball_tree.query_radius([[x, y]], r=r)
    try:
        return len(index[0])
    except:
        return 0


def get_color_scheme(datasource_name, refresh, label_field='phenotype'):
    color_scheme_path = str(
        Path(os.path.join(os.getcwd())) / "cycif_viewer" / "data" / datasource_name / str(
            label_field + "_color_scheme.pickle"))
    if refresh == False:
        if os.path.isfile(color_scheme_path):
            print("Color Scheme Exists, Loading")
            color_scheme = pickle.load(open(color_scheme_path, "rb"))
            return color_scheme
    if label_field == 'phenotype':
        labels = get_phenotypes(datasource_name)
    labels.append('SelectedCluster')
    color_scheme = {}
    colors = ["#FFFF00", "#1CE6FF", "#FF34FF", "#FF4A46", "#008941", "#006FA6", "#A30059", "#FFDBE5", "#7A4900",
              "#0000A6", "#63FFAC", "#B79762", "#004D43", "#8FB0FF", "#997D87", "#5A0007", "#809693", "#FEFFE6",
              "#1B4400", "#4FC601", "#3B5DFF", "#4A3B53", "#FF2F80", "#61615A", "#BA0900", "#6B7900", "#00C2A0",
              "#FFAA92", "#FF90C9", "#B903AA", "#D16100", "#DDEFFF", "#000035", "#7B4F4B", "#A1C299", "#300018",
              "#0AA6D8", "#013349", "#00846F", "#372101", "#FFB500", "#C2FFED", "#A079BF", "#CC0744", "#C0B9B2",
              "#C2FF99", "#001E09", "#00489C", "#6F0062", "#0CBD66", "#EEC3FF", "#456D75", "#B77B68", "#7A87A1",
              "#788D66", "#885578", "#FAD09F", "#FF8A9A", "#D157A0", "#BEC459", "#456648", "#0086ED", "#886F4C",
              "#34362D", "#B4A8BD", "#00A6AA", "#452C2C", "#636375", "#A3C8C9", "#FF913F", "#938A81", "#575329",
              "#00FECF", "#B05B6F", "#8CD0FF", "#3B9700", "#04F757", "#C8A1A1", "#1E6E00", "#7900D7", "#A77500",
              "#6367A9", "#A05837", "#6B002C", "#772600", "#D790FF", "#9B9700", "#549E79", "#FFF69F", "#201625",
              "#72418F", "#BC23FF", "#99ADC0", "#3A2465", "#922329", "#5B4534", "#FDE8DC", "#404E55", "#0089A3",
              "#CB7E98", "#A4E804", "#324E72", "#6A3A4C", "#83AB58", "#001C1E", "#D1F7CE", "#004B28", "#C8D0F6",
              "#A3A489", "#806C66", "#222800", "#BF5650", "#E83000", "#66796D", "#DA007C", "#FF1A59", "#8ADBB4",
              "#1E0200", "#5B4E51", "#C895C5", "#320033", "#FF6832", "#66E1D3", "#CFCDAC", "#D0AC94", "#7ED379",
              "#012C58", "#7A7BFF", "#D68E01", "#353339", "#78AFA1", "#FEB2C6", "#75797C", "#837393", "#943A4D",
              "#B5F4FF", "#D2DCD5", "#9556BD", "#6A714A", "#001325", "#02525F", "#0AA3F7", "#E98176", "#DBD5DD",
              "#5EBCD1", "#3D4F44", "#7E6405", "#02684E", "#962B75", "#8D8546", "#9695C5", "#E773CE", "#D86A78",
              "#3E89BE", "#CA834E", "#518A87", "#5B113C", "#55813B", "#E704C4", "#00005F", "#A97399", "#4B8160",
              "#59738A", "#FF5DA7", "#F7C9BF", "#643127", "#513A01", "#6B94AA", "#51A058", "#A45B02", "#1D1702",
              "#E20027", "#E7AB63", "#4C6001", "#9C6966", "#64547B", "#97979E", "#006A66", "#391406", "#F4D749",
              "#0045D2", "#006C31", "#DDB6D0", "#7C6571", "#9FB2A4", "#00D891", "#15A08A", "#BC65E9", "#FFFFFE",
              "#C6DC99", "#203B3C", "#671190", "#6B3A64", "#F5E1FF", "#FFA0F2", "#CCAA35", "#374527", "#8BB400",
              "#797868", "#C6005A", "#3B000A", "#C86240", "#29607C", "#402334", "#7D5A44", "#CCB87C", "#B88183",
              "#AA5199", "#B5D6C3", "#A38469", "#9F94F0", "#A74571", "#B894A6", "#71BB8C", "#00B433", "#789EC9",
              "#6D80BA", "#953F00", "#5EFF03", "#E4FFFC", "#1BE177", "#BCB1E5", "#76912F", "#003109", "#0060CD",
              "#D20096", "#895563", "#29201D", "#5B3213", "#A76F42", "#89412E", "#1A3A2A", "#494B5A", "#A88C85",
              "#F4ABAA", "#A3F3AB", "#00C6C8", "#EA8B66", "#958A9F", "#BDC9D2", "#9FA064", "#BE4700", "#658188",
              "#83A485", "#453C23", "#47675D", "#3A3F00", "#061203", "#DFFB71", "#868E7E", "#98D058", "#6C8F7D",
              "#D7BFC2", "#3C3E6E", "#D83D66", "#2F5D9B", "#6C5E46", "#D25B88", "#5B656C", "#00B57F", "#545C46",
              "#866097", "#365D25", "#252F99", "#00CCFF", "#674E60", "#FC009C", "#92896B"]
    for i in range(len(labels)):
        color_scheme[str(labels[i])] = {}
        color_scheme[str(labels[i])]['rgb'] = list(ImageColor.getcolor(colors[i], "RGB"))
        color_scheme[str(labels[i])]['hex'] = colors[i]

    pickle.dump(color_scheme, open(color_scheme_path, 'wb'))
    return color_scheme


def get_cluster_labels(datasource_name):
    global config
    data = np.load(Path("." + config[datasource_name]['embedding']))
    clusters = np.unique(data[:, 2])
    return clusters.astype('int32').tolist()


def get_scatterplot_data(datasource_name):
    global config
    data = np.load(Path("." + config[datasource_name]['embedding']))
    list_of_obs = [{'x': elem[0], 'y': elem[1], 'id': id} for id, elem in enumerate(data)]
    visData = {
        'data': list_of_obs,
        'xMin': np.min(data[:, 0]),
        'xMax': np.max(data[:, 0]),
        'yMin': np.min(data[:, 1]),
        'yMax': np.max(data[:, 1]),
        'clusters': np.unique(data[:, 2]).astype('int32').tolist()
    }
    return visData


def get_rect_cells(datasource_name, rect, channels):
    global datasource
    global source
    global ball_tree

    # Load if not loaded
    if datasource_name != source:
        load_ball_tree(datasource_name)

    # Query
    index = ball_tree.query_radius([[rect[0], rect[1]]], r=rect[2])
    print('Query size:', len(index[0]))
    neighbors = index[0]
    try:
        neighborhood = []
        for neighbor in neighbors:
            row = datasource.iloc[[neighbor]]
            obj = row.to_dict(orient='records')[0]
            if 'phenotype' not in obj:
                obj['phenotype'] = ''
            neighborhood.append(obj)
        return neighborhood
    except:
        return {}


def get_cells_in_polygon(datasource_name, points, similar_neighborhood=False):
    global config
    point_tuples = [(e['imagePoints']['x'], e['imagePoints']['y']) for e in points]
    (x, y, r) = smallestenclosingcircle.make_circle(point_tuples)
    fields = [config[datasource_name]['featureData'][0]['xCoordinate'],
              config[datasource_name]['featureData'][0]['yCoordinate'], 'phenotype', 'id']
    circle_neighbors = get_individual_neighborhood(x, y, datasource_name, r=r,
                                                   fields=fields)
    neighbor_points = pd.DataFrame(circle_neighbors).values
    path = mpltPath.Path(point_tuples)
    inside = path.contains_points(neighbor_points[:, [0, 1]].astype('float'))
    neighbor_ids = neighbor_points[np.where(inside == True), 3].flatten().tolist()
    obj = get_neighborhood_stats(neighbor_ids, fields=fields)
    return obj


def get_similar_neighborhood_to_selection(datasource_name, selection_ids, similarity):
    fields = [config[datasource_name]['featureData'][0]['xCoordinate'],
              config[datasource_name]['featureData'][0]['yCoordinate'], 'phenotype', 'id']
    obj = {}
    # This is the standard 50 radius neighborhood data
    standard_neighborhoods = np.load(Path("cycif_viewer/data/Ton/complex_small.npy")).squeeze()
    # Dynamic Neighborhood Array Code
    # if len(selection_ids) < 1000:
    #     neighborhood_array = standard_neighborhoods
    # elif len(selection_ids) < 10000:
    #     neighborhood_array = np.load(Path("cycif_viewer/data/Ton/complex_medium.npy")).squeeze()
    # else:
    #     neighborhood_array = np.load(Path("cycif_viewer/data/Ton/complex_large.npy")).squeeze()

    selection_summary = np.mean(standard_neighborhoods[selection_ids, :], axis=0)
    similar_ids = find_similarity(selection_summary, similarity)
    obj = get_neighborhood_stats(similar_ids, fields=fields)
    obj['raw_summary'] = selection_summary
    return obj


def find_similarity(cluster_summary, similarity):
    neighborhood_array = np.load(Path("cycif_viewer//data/Ton/neighborhood_array_complex.npy"))
    test = time.time()
    distances = 1 - spatial.distance.cdist([cluster_summary], neighborhood_array, "cosine")[0]
    print("Time", time.time() - test)
    greater_than = np.argwhere(distances > similarity).flatten()
    return greater_than


def get_gated_cells(datasource_name, gates):
    global datasource
    global source
    global ball_tree

    # Load if not loaded
    if datasource_name != source:
        load_ball_tree(datasource_name)

    query_string = ''
    for key, value in gates.items():
        if query_string != '':
            query_string += ' and '
        query_string += str(value[0]) + ' < ' + key + ' < ' + str(value[1])
    if query_string == None or query_string == "":
        return []
    query = datasource.query(query_string)[['id']].to_dict(orient='records')
    return query


def download_gating_csv(datasource_name, gates, channels):
    global datasource
    global source
    global ball_tree

    # Load if not loaded
    if datasource_name != source:
        load_ball_tree(datasource_name)

    query_string = ''
    columns = []
    for key, value in gates.items():
        columns.append(key)
        if query_string != '':
            query_string += ' and '
        query_string += str(value[0]) + ' < ' + key + ' < ' + str(value[1])
    ids = datasource.query(query_string)[['id']].to_numpy().flatten()
    if 'idField' in config[datasource_name]['featureData'][0]:
        idField = config[datasource_name]['featureData'][0]['idField']
    else:
        idField = "CellID"
    columns.append(idField)

    csv = datasource.copy()

    csv[idField] = datasource['id']
    for channel in channels:
        if channel in gates:
            csv.loc[csv[idField].isin(ids), key] = 1
            csv.loc[~csv[idField].isin(ids), key] = 0
        else:
            csv[channel] = 0

    return csv


def download_gates(datasource_name, gates, channels):
    global datasource
    global source
    global ball_tree

    # Load if not loaded
    if datasource_name != source:
        load_ball_tree(datasource_name)
    arr = []
    for key, value in channels.items():
        arr.append([key, value[0], value[1]])
    csv = pd.DataFrame(arr)
    csv.columns = ['channel', 'gate_start', 'gate_end']
    csv['gate_active'] = False
    for channel in gates:
        csv.loc[csv['channel'] == channel, 'gate_active'] = True
        csv.loc[csv['channel'] == channel, 'gate_start'] = gates[channel][0]
        csv.loc[csv['channel'] == channel, 'gate_end'] = gates[channel][1]
    return csv


def get_datasource_description(datasource_name):
    global datasource
    global source
    global ball_tree

    # Load if not loaded
    if datasource_name != source:
        load_ball_tree(datasource_name)
    description = datasource.describe().to_dict()
    for column in description:
        [hist, bin_edges] = np.histogram(datasource[column].to_numpy(), bins=50, density=True)
        midpoints = (bin_edges[1:] + bin_edges[:-1]) / 2
        description[column]['histogram'] = {}
        dat = []
        for i in range(len(hist)):
            obj = {}
            obj['x'] = midpoints[i]
            obj['y'] = hist[i]
            dat.append(obj)
        description[column]['histogram'] = dat
    return description


def generate_zarr_png(datasource_name, channel, level, tile):
    if config is None:
        load_datasource(datasource_name)
    global channels
    global seg
    [tx, ty] = tile.replace('.png', '').split('_')
    tx = int(tx)
    ty = int(ty)
    level = int(level)
    tile_width = config[datasource_name]['tileWidth']
    tile_height = config[datasource_name]['tileHeight']
    ix = tx * tile_width
    iy = ty * tile_height
    segmentation = False
    try:
        channel_num = int(re.match(r".*_(\d*)$", channel).groups()[0])
    except AttributeError:
        segmentation = True
    if segmentation:
        tile = seg[level][iy:iy + tile_height, ix:ix + tile_width]
    else:
        if isinstance(channels, zarr.Array):
            tile = channels[channel_num, iy:iy + tile_height, ix:ix + tile_width]
        else:
            tile = channels[level][channel_num, iy:iy + tile_height, ix:ix + tile_width]

    tile = np.ascontiguousarray(tile, dtype='uint32')
    png = tile.view('uint8').reshape(tile.shape + (-1,))[..., [2, 1, 0]]
    return png


def get_ome_metadata(datasource_name):
    if config is None:
        load_datasource(datasource_name)
    global metadata
    return metadata


def convertOmeTiff(filePath, channelFilePath=None, dataDirectory=None, isLabelImg=False):
    channel_info = {}
    channelNames = []
    if isLabelImg == False:
        channel_io = tf.TiffFile(str(filePath), is_ome=False)
        channels = zarr.open(channel_io.series[0].aszarr())
        if isinstance(channels, zarr.Array):
            channel_info['maxLevel'] = 1
            chunks = channels.chunks
            shape = channels.shape
        else:
            channel_info['maxLevel'] = len(channels)
            shape = channels[0].shape
            chunks = (1, 1024, 1024)
        chunks = (chunks[-2], chunks[-1])
        channel_info['tileHeight'] = chunks[0]
        channel_info['tileWidth'] = chunks[1]
        channel_info['height'] = shape[1]
        channel_info['width'] = shape[2]
        channel_info['num_channels'] = shape[0]
        for i in range(shape[0]):
            channelName = re.sub(r'\.ome|\.tiff|\.tif|\.png', '', filePath.name) + "_" + str(i)
            channelNames.append(channelName)
        channel_info['channel_names'] = channelNames
        return channel_info
    else:
        channel_io = tf.TiffFile(str(channelFilePath), is_ome=False)
        channels = zarr.open(channel_io.series[0].aszarr())
        directory = Path(dataDirectory + "/" + filePath.name)
        args = {}
        args['in_paths'] = [Path(filePath)]
        args['out_path'] = directory
        args['is_mask'] = True
        pyramid_assemble.main(py_args=args)

        return {'segmentation': str(directory)}


def get_neighborhood_stats(indices, cluster_cells=None, fields=[]):
    global datasource
    global source
    default_fields = ['id', 'Cluster', 'phenotype']
    for field in fields:
        if field not in default_fields:
            default_fields.append(field)

    if cluster_cells is None:
        cluster_cells = datasource.loc[indices, default_fields].to_dict(orient='records')
    else:
        cluster_cells = cluster_cells[['id', 'Cluster', 'phenotype']].to_dict(orient='records')
    neighborhood_array = np.load(Path("cycif_viewer/data/Ton/neighborhood_array_complex.npy"))
    cluster_summary = np.mean(neighborhood_array[indices, :], axis=0)
    summary_stats = {'neighborhood_count': {}, 'avg_weight': {}, 'weighted_contribution': {}}
    phenotypes = datasource.phenotype.unique().tolist()
    for i in range(len(phenotypes)):
        count = cluster_summary[i * 2]
        weight = cluster_summary[i * 2 + 1]
        summary_stats['neighborhood_count'][phenotypes[i]] = count
        summary_stats['avg_weight'][phenotypes[i]] = weight
        summary_stats['weighted_contribution'][phenotypes[i]] = weight * count
    obj = {'cells': cluster_cells, 'cluster_summary': summary_stats}
    return obj

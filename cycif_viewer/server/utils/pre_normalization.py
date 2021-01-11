import numpy as np


def preNormalize(input_csvPath, output_csvPath, skip_columns=[]):
    RAW_DATA = np.genfromtxt(input_csvPath, names=True, dtype=float, delimiter=',')
    marker_list = RAW_DATA.dtype.names
    norm_data = RAW_DATA.view((np.float, len(marker_list)))

    # A list of markers to skip normalization
    # markers_notToNorm = ['Field_Row', 'Field_Col', 'CellID', 'X_position','Y_position','Percent_Touching','Number_Neighbors','Neighbor_1','Neighbor_2','Neighbor_3','Neighbor_4','Neighbor_5', 'Eccentricity',	'Solidity',	'Extent',	'EulerNumber',	'Perimeter',	'MajorAxisLength',	'MinorAxisLength',	'Orientation',	'X_position',	'Y_position']
    # A list of markers to skip log10 transform
    # markers_notToLog = ['DAPI1', 'A488b1', 'A555b1'] # skip 'DAPI1', 'A488b1', 'A555b1'
    markers_notToLog = []  # nothing to skip

    for marker_id in range(norm_data.shape[1]):
        if marker_list[marker_id] in skip_columns:
            continue
        if marker_list[marker_id] in markers_notToLog:
            # Log10 transform
            norm_data[:, marker_id] = np.log10(norm_data[:, marker_id] + 1)
            print(marker_list[marker_id], 'with log10 transform')
        else:
            print(marker_list[marker_id], 'without log10 transform')
        # Percentile normalization by mapping [0.1%, 99.9%] into [0, 1]
        min_tile, max_tile = np.percentile(norm_data[:, marker_id], [0.1, 99.9])

        # norm_data[:, marker_id] =(norm_data[:, marker_id] - min_tile) * (max_tile - min_tile) / (max_tile - min_tile) + min_tile
        norm_data[:, marker_id] = (norm_data[:, marker_id] - min_tile) / (max_tile - min_tile)
        norm_data[:, marker_id] = np.minimum(norm_data[:, marker_id], 1)
        norm_data[:, marker_id] = np.maximum(norm_data[:, marker_id], 0)

    with open(output_csvPath, 'w') as f:
        for marker_id, marker_name in enumerate(marker_list):
            f.write(marker_name)
            if marker_id != (len(marker_list) - 1):
                f.write(',')
        f.write('\n')
        for norm_row in norm_data:
            for elem_id, norm_elem in enumerate(norm_row):
                f.write(str(norm_elem))
                if elem_id != (norm_row.shape[0] - 1):
                    f.write(',')
            f.write('\n')

# input_csvPath = 'Sample_23.csv'
# output_csvPath = 'Sample_23_norm2.csv'
# preNormalize(input_csvPath, output_csvPath)

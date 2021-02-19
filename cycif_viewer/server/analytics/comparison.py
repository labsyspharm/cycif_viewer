from cycif_viewer.server.models import data_model
import numpy as np
import scipy.misc as sp
import matplotlib
import matplotlib.pyplot as plt
import time
import tifffile as tf
import re
import zarr
import sys

from skimage import data, transform
from skimage.util import img_as_ubyte
from skimage.morphology import disk
from skimage.filters import rank
from skimage.io import imread
from skimage.color import rgb2gray
from skimage.transform import rescale, resize, downscale_local_mean

import matplotlib.pyplot as plt
from matplotlib import image
from skimage import measure
import cv2


from cycif_viewer import data_path

def prepSlidingWindow():
    print('hi')


def histogramComparison(x, y, datasource_name, r, channels, viewport, zoomlevel, sensibility):
    tic = time.perf_counter()

    # load png at zoom level
    png = loadPng(datasource_name, channels[0], zoomlevel)

    # image = rgb2gray(png)
    # img = png[..., 0] * 0.299 + png[..., 1] * 0.587 + png[..., 2] * 0.114

    img = rgb2gray(png);
    # round zoom level
    zoomlevel = int(zoomlevel)
    print(zoomlevel)
    # calculate roi
    print(str(x) + ' ' + str(y) + ' ' + str(r))
    x = int(x)
    y = int(y)
    r = int(r)
    coin_coords = [x - r, y - r, x + r, y + r]  # 44 x 44 region
    roi = img[coin_coords[1]:coin_coords[3],
           coin_coords[0]:coin_coords[2]]

    # calc image similarity map
    sim_map = calc_sim(img, roi)

    # find contours
    contours = find_contours(img, sim_map, sensibility)

    return {'contours': contours}


# load a channel as png using zarr in full width and height
def loadPng(datasource_name, channel, zoomlevel):
    ix = 0
    iy = 0
    print(channel)
    print(data_model.get_channel_names(datasource_name, shortnames=False))
    channel = data_model.get_channel_names(datasource_name, shortnames=False).index(channel)

    if isinstance(data_model.channels, zarr.Array):
        tile = data_model.channels[channel, ix:data_model.config[datasource_name]["width"],
               iy:data_model.config[datasource_name]["height"]]
    else:
        tile = data_model.channels[zoomlevel][channel, ix:data_model.config[datasource_name]["width"],
               iy:data_model.config[datasource_name]["height"]]

    tile = np.ascontiguousarray(tile, dtype='uint32')
    png = tile.view('uint8').reshape(tile.shape + (-1,))[..., [2, 1, 0]]

    return png


def find_contours(img, sim_map, eta):
    sim_map = sim_map / sim_map.max()
    contours = measure.find_contours(sim_map, eta, fully_connected='high')

    print(data_path)
    f = open('cycif_viewer/server/analytics/measures/centers.txt', 'w')
    f.write('x,y\n')
    for contour in contours:
        # calculate centers
        f.write('{},{}\n'.format(round(contour[:, 1].mean(), 3),
                                 round(contour[:, 1].mean(), 3)))
    f.close()

    return contours

def plotting_thread(fig, axe):
    while (True):
        mat = np.random.randn(256, 256)
        time.sleep(2)  # ... or some busy computing
        axe.clear()
        axe.imshow(mat)
        fig.canvas.draw_idle()  # use draw_idle instead of draw


def windowed_histogram_similarity(image, selem, reference_hist, n_bins):
    # Compute normalized windowed histogram feature vector for each pixel
    px_histograms = rank.windowed_histogram(image, selem, n_bins=n_bins)

    # Reshape coin histogram to (1,1,N) for broadcast when we want to use it in
    # arithmetic operations with the windowed histograms from the image
    reference_hist = reference_hist.reshape((1, 1) + reference_hist.shape)

    # Compute Chi squared distance metric: sum((X-Y)^2 / (X+Y));
    # a measure of distance between histograms
    X = px_histograms
    Y = reference_hist

    num = (X - Y) ** 2
    denom = X + Y
    denom[denom == 0] = np.infty
    frac = num / denom

    chi_sqr = 0.5 * np.sum(frac, axis=2)

    # Generate a similarity measure. It needs to be low when distance is high
    # and high when distance is low; taking the reciprocal will do this.
    # Chi squared will always be >= 0, add small value to prevent divide by 0.
    similarity = 1 / (chi_sqr + 1.0e-4)

    return similarity


def calc_sim(img, coin):
    if img.shape[-1] == 3:
        img = rgb2gray(img)
    img = img.astype('uint8')
    img = img_as_ubyte(img)

    if coin.shape[-1] == 3:
        coin = rgb2gray(coin)
    coin = coin.astype('uint8')
    coin = img_as_ubyte(coin)

    quantized_img = img // 16
    coin = coin // 16

    # Compute coin histogram and normalize
    coin_hist, _ = np.histogram(coin.flatten(), bins=16, range=(0, 16))
    coin_hist = coin_hist.astype(float) / np.sum(coin_hist)

    # Compute a disk shaped mask that will define the shape of our sliding window
    # A disk with diameter equal to max(w,h) of the roi should be a big enough reference
    selem = disk(max(coin.shape) // 2)

    # Compute the similarity across the complete image
    similarity = windowed_histogram_similarity(quantized_img, selem, coin_hist, coin_hist.shape[0])

    cv2.imwrite('cycif_viewer/server/analytics/img/sim_map.jpg', similarity)

    return similarity
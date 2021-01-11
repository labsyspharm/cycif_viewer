# Via https://raw.githubusercontent.com/labsyspharm/ome-tiff-pyramid-tools/master/pyramid_assemble.py
from __future__ import print_function, division
import warnings
import sys
import os
import re
import io
import argparse
import pathlib
import struct
import itertools
import uuid
import multiprocessing
import concurrent.futures
import numpy as np
import tifffile
import zarr
import skimage.transform

# This API is apparently changing in skimage 1.0 but it's not clear to
# me what the replacement will be, if any. We'll explicitly import
# this so it will break loudly if someone tries this with skimage 1.0.
try:
    from skimage.util.dtype import _convert as dtype_convert
except ImportError:
    from skimage.util.dtype import convert as dtype_convert


def preduce(coords, img_in, img_out, is_mask):
    (iy1, ix1), (iy2, ix2) = coords
    (oy1, ox1), (oy2, ox2) = np.array(coords) // 2
    if is_mask:
        tile = img_in[iy1:iy2:2, ix1:ix2:2]
    else:
        tile = skimage.img_as_float32(img_in[iy1:iy2, ix1:ix2])
        tile = skimage.transform.downscale_local_mean(tile, (2, 2))
        tile = dtype_convert(tile, img_out.dtype)
    img_out[oy1:oy2, ox1:ox2] = tile


def imsave(path, img, tile_size, **kwargs):
    tifffile.imwrite(
        path, img, bigtiff=True, append=True, tile=(tile_size, tile_size),
        metadata=None, **kwargs
    )


def format_shape(shape):
    return "%dx%d" % (shape[1], shape[0])


def construct_xml(filename, shapes, num_channels, ome_dtype, pixel_size=1):
    img_uuid = uuid.uuid4().urn
    ifd = 0
    xml = io.StringIO()
    xml.write(u'<?xml version="1.0" encoding="UTF-8"?>')
    xml.write(
        (u'<OME xmlns="http://www.openmicroscopy.org/Schemas/OME/2016-06"'
         ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'
         ' UUID="{uuid}"'
         ' xsi:schemaLocation="http://www.openmicroscopy.org/Schemas/OME/2016-06'
         ' http://www.openmicroscopy.org/Schemas/OME/2016-06/ome.xsd">')
            .format(uuid=img_uuid)
    )
    for level, shape in enumerate(shapes):
        if level == 0:
            psize_xml = (
                u'PhysicalSizeX="{0}" PhysicalSizeXUnit="\u00b5m"'
                u' PhysicalSizeY="{0}" PhysicalSizeYUnit="\u00b5m"'
                    .format(pixel_size)
            )
        else:
            psize_xml = u''
        xml.write(u'<Image ID="Image:{}">'.format(level))
        xml.write(
            (u'<Pixels BigEndian="false" DimensionOrder="XYZCT"'
             ' ID="Pixels:{level}" {psize_xml} SizeC="{num_channels}" SizeT="1"'
             ' SizeX="{sizex}" SizeY="{sizey}" SizeZ="1" Type="{ome_dtype}">')
                .format(
                level=level, psize_xml=psize_xml, num_channels=num_channels,
                sizex=shape[1], sizey=shape[0], ome_dtype=ome_dtype
            )
        )
        for channel in range(num_channels):
            xml.write(
                (u'<Channel ID="Channel:{level}:{channel}"'
                 + (u' Name="Channel {channel}"' if level == 0 else u'')
                 + u' SamplesPerPixel="1"><LightPath/></Channel>')
                    .format(level=level, channel=channel)
            )
        for channel in range(num_channels):
            xml.write(
                (u'<TiffData FirstC="{channel}" FirstT="0" FirstZ="0"'
                 ' IFD="{ifd}" PlaneCount="1">'
                 '<UUID FileName="{filename}">{uuid}</UUID>'
                 '</TiffData>')
                    .format(
                    channel=channel, ifd=ifd, filename=filename, uuid=img_uuid
                )
            )
            ifd += 1
        if level == 0:
            for channel in range(num_channels):
                xml.write(
                    u'<Plane TheC="{channel}" TheT="0" TheZ="0"/>'
                        .format(channel=channel)
                )
        xml.write(u'</Pixels>')
        xml.write(u'</Image>')
    xml.write(u'</OME>')
    xml_bytes = xml.getvalue().encode('utf-8') + b'\x00'
    return xml_bytes


def patch_ometiff_xml(path, xml_bytes):
    with open(path, 'rb+') as f:
        f.seek(0, io.SEEK_END)
        xml_offset = f.tell()
        f.write(xml_bytes)
        f.seek(0)
        ifd_block = f.read(500)
        match = re.search(b'!!xml!!\x00', ifd_block)
        if match is None:
            raise RuntimeError("Did not find placeholder string in IFD")
        f.seek(match.start() - 8)
        f.write(struct.pack('<Q', len(xml_bytes)))
        f.write(struct.pack('<Q', xml_offset))


def error(path, msg):
    print(f"\nERROR: {path}: {msg}")
    sys.exit(1)


def main(py_args=None):
    tile_size = 1024
    if py_args is None:
        parser = argparse.ArgumentParser()
        parser.add_argument(
            "in_paths", metavar="input.tif", type=pathlib.Path, nargs="+",
            help="List of TIFF files to combine. All images must have the same"
                 " dimensions and pixel type.",
        )
        parser.add_argument(
            "out_path", metavar="output.tif", type=pathlib.Path,
            help="Output filename. Script will exit immediately if file exists.",
        )
        parser.add_argument(
            "--pixel-size", metavar="SIZE", type=float, default=1.0,
            help="size in microns; default is 1.0",
        )
        parser.add_argument(
            "--mask", action="store_true", default=False,
            help="adjust processing for label mask or binary mask images (currently just switch to nearest-neighbor downsampling)",
        )
        args = parser.parse_args()
        in_paths = args.in_paths
        out_path = args.out_path
        is_mask = args.mask
        pixel_size = args.pixel_size
    else:
        in_paths = py_args['in_paths']
        out_path = py_args['out_path']
        is_mask = py_args['is_mask']
        pixel_size = 1
    if out_path.exists():
            error(out_path, "Output file already exists, aborting.")

    if hasattr(os, 'sched_getaffinity'):
        num_workers = len(os.sched_getaffinity(0))
    else:
        num_workers = multiprocessing.cpu_count()
    print(f"Using {num_workers} worker threads based on detected CPU count.")
    print()

    print("Appending input images")
    for i, path in enumerate(in_paths):
        print(f"    {i + 1}: {path}")
        img_in = tifffile.imread(path)
        if i == 0:
            base_shape = img_in.shape
            dtype = img_in.dtype
            if dtype == np.uint32:
                if not is_mask:
                    error(
                        path,
                        "uint32 images are only supported in --mask mode."
                        " Please contact the authors if you need support for"
                        " intensity-based uint32 images."
                    )
                ome_dtype = 'uint32'
            elif dtype == np.int32:
                img_in = img_in.view('uint32')
                dtype = np.uint32
                ome_dtype = 'uint32'
            elif dtype == np.uint16:
                ome_dtype = 'uint16'
            elif dtype == np.uint8:
                ome_dtype = 'uint8'
            else:
                error(
                    path,
                    f"Can't handle dtype '{dtype}' yet, please contact the"
                    f" authors."
                )
            kwargs = {
                'description': '!!xml!!',
                'software': 'Glencoe/Faas pyramid'
            }
        else:
            if img_in.shape != base_shape:
                error(
                    path,
                    f"Expected shape {base_shape} to match first input image,"
                    f" got {img_in.shape} instead."
                )
            if img_in.dtype != dtype:
                error(
                    path,
                    f"Expected dtype '{dtype}' to match first input image,"
                    f" got '{img_in.dtype}' instead."
                )
            kwargs = {}
        imsave(out_path, img_in, tile_size, **kwargs)
        del img_in
    print()

    num_channels = len(in_paths)
    num_levels = np.ceil(np.log2(max(base_shape) / tile_size)) + 1
    factors = 2 ** np.arange(num_levels)
    shapes = (np.ceil(np.array(base_shape) / factors[:, None])).astype(int)

    print("Pyramid level sizes:")
    for i, shape in enumerate(shapes):
        print(f"    level {i + 1}: {format_shape(shape)}", end="")
        if i == 0:
            print(" (original size)", end="")
        print()
    print()

    executor = concurrent.futures.ThreadPoolExecutor(num_workers)

    shape_pairs = zip(shapes[:-1], shapes[1:])
    for level, (shape_in, shape_out) in enumerate(shape_pairs):

        print("Resizing channels for level {} ({} -> {})".format(
            level + 2, format_shape(shape_in), format_shape(shape_out)
        ))

        ty = np.array(range(0, shape_in[0], tile_size))
        tx = np.array(range(0, shape_in[1], tile_size))
        coords = list(zip(
            itertools.product(ty, tx),
            itertools.product(ty + tile_size, tx + tile_size)
        ))
        img_out = np.empty(shape_out, dtype)

        for c in range(num_channels):

            tiff = tifffile.TiffFile(out_path)
            page = level * num_channels + c
            img_in = zarr.open(tiff.aszarr(key=page), mode="r")
            for i, _ in enumerate(executor.map(
                    preduce, coords,
                    itertools.repeat(img_in), itertools.repeat(img_out),
                    itertools.repeat(is_mask)
            )):
                percent = int((i + 1) / len(coords) * 100)
                if i % 20 == 0 or percent == 100:
                    print(f"\r    {c + 1}: {percent}%", end="")
                    sys.stdout.flush()
            tiff.close()
            imsave(out_path, img_out, tile_size)
            print()

        print()

    xml = construct_xml(
        os.path.basename(out_path), shapes, num_channels, ome_dtype, pixel_size
    )
    patch_ometiff_xml(out_path, xml)


if __name__ == '__main__':
    main()

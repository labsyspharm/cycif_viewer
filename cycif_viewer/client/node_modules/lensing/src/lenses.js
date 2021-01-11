import * as d3 from 'd3';

/*
LFilters
 + Some filters from National Institute of Standards and Technology (indicated below)
   - https://github.com/usnistgov/OpenSeadragonFiltering/blob/master/openseadragon-filtering.js
 + Fisheye magnification demo from jOloga
   - https://codepen.io/jOlga/pen/KyQMQW?editors=0010
 + Color differences
   - https://www.compuphase.com/cmetric.htm
 + Gamma
   - https://stackoverflow.com/questions/16521003/gamma-correction-formula-gamma-or-1-gamma
 + Sobel edge
   - https://stackoverflow.com/questions/17815687/image-processing-implementing-sobel-filter
   - https://github.com/miguelmota/sobel
 */

/* TODO
    - need to optimize for any image greater than the lens dims
 */

export default class Lenses {

    // Class refs
    lensing = null;

    // Configs
    config = {
        preserve: 0.75,
        scale: 1
    };

    // Selections
    selections = {
        filter: null,
        magnifier: null
    };

    // Data
    img_data = {
        orig: null,
        copy: null,
        copy_indexed: []
    };

    // Tools
    tools = {
        plateauScale: d3.scaleSqrt()
    }

    /*
    CONSTRUCTOR
     */
    constructor(_lensing) {
        // Fields
        this.lensing = _lensing;
        // Defaults
        this.selections.filter = this.filters[0];
        this.selections.magnifier = this.magnifiers[0];
    }

    /**
     * @function modify
     *
     * @param {ImageData} imgD
     *
     * @returns ImageData
     */
    modify(imgD) {

        // Do not need deep copy atm
        this.img_data.orig = imgD;
        this.img_data.copy = {
            data: []
        };
        this.img_data.copy_indexed = [];

        // Iterate and update
        if (this.selections.filter.settings.iter === 'px') {
            let index = 0;
            this.img_data.copy.data = this.img_data.orig.data;
            for (let i = 0; i < this.img_data.orig.data.length; i += 4) {
                // Update filter
                this.selections.filter.update(i, index);
                // Increment index
                index++;
            }
        } else if (this.selections.filter.settings.iter === 'wh') {
            // Copy
            for (let y = 0; y < this.img_data.orig.height; y++) {
                for (let x = 0; x < this.img_data.orig.width; x++) {
                    // Update filter
                    this.selections.filter.update(x, y);
                }
            }
        }

        // Update viewfinder
        this.lensing.viewfinder.wrangle();

        // Return modified image data
        const copyData = new Uint8ClampedArray(this.img_data.copy.data);
        // KEEP4REF // console.log(copyImageData, Math.sqrt(copyImageData.data.length / 4));
        return new ImageData(copyData, this.img_data.orig.width, this.img_data.orig.height);
    }

    /**
     * @function change_lens
     *
     * @param {string} direction
     * @param {string} lensType
     *
     * @returns void
     */
    change_lens(direction, lensType) {
        let lensSet = [];
        if (lensType === 'filter') {
            lensSet = this.filters;
        } else if (lensType === 'magnifier') {
            lensSet = this.magnifiers;
        }
        let index = 0;
        if (direction === 'none') {
            this.selections[lensType] = lensSet[index];
        } else {
            lensSet.forEach((f, i) => {
                if (f.name === this.selections[lensType].name) {
                    index = i;
                }
            });
            if (direction === 'next') {
                if (index + 1 === lensSet.length) {
                    this.selections[lensType] = lensSet[0];
                } else {
                    this.selections[lensType] = lensSet[index + 1];
                }
            } else if (direction === 'prev') {
                if (index - 1 < 0) {
                    this.selections[lensType] = lensSet[this.filters.length - 1];
                } else {
                    this.selections[lensType] = this.filters[index - 1];
                }
            }
        }
    }

    /**
     * @function check_for_data_filter
     *
     * @param {Object} ref
     *
     * @returns void
     */
    check_for_data_filter(ref) {

        // Define this
        const vis = this;

        // Filter
        const data_filter = this.data_filters.find(d => d.name === ref.config.filter);
        if (data_filter) {
            installFilter(data_filter)
        } else if (ref.config.filter === 'fil_data_custom') {
            installFilter(ref.config.filterCode);
        }

        // Abstract installation
        function installFilter(fil) {
            // Add to filters
            const first = vis.filters.shift();
            vis.filters.unshift(fil);
            vis.filters.unshift(first);
            // Update w data
            fil.data = ref.data;
        }
    }

    /**
     * @function update_filter
     *
     * @param {number} val
     *
     * @returns void
     */
    update_filter(val) {

        // Update filter
        this.selections.filter.settings.active = val;
    }

    /*
    filters
     */
    filters = [
        // Natural
        {
            name: 'fil_none',
            vis_name: 'No Filter',
            settings: {
                active: 1,
                async: false,
                default: 1,
                loading: false,
                max: 1,
                min: 0,
                step: 1,
                vf: false,
                iter: 'px'
            },
            update: (i, index) => {
                // Magnify
                this.selections.magnifier.update(i, index);
            },
            fill: 'rgba(255, 255, 255, 0)',
            stroke: 'rgba(0, 0, 0, 1)'
        },
        // Sobel Edge
        {
            name: 'fil_sobeledge',
            vis_name: 'Sobel Edge',
            settings: {
                active: 127,
                async: false,
                default: 127,
                loading: false,
                max: 255,
                min: 0,
                step: 1,
                vf: false,
                iter: 'wh'
            },
            update: (x, y) => {

                // TODO - need to optimize - slow performance

                // Define this
                const vis = this;
                // Kernals
                const sobel_x = [
                    [-1, 0, 1],
                    [-2, 0, 2],
                    [-1, 0, 1]
                ];
                const sobel_y = [
                    [-1, -2, -1],
                    [0, 0, 0],
                    [1, 2, 1]
                ];

                // Px location
                function getPxLoc(xx, yy) {
                    return ((yy * vis.img_data.orig.width) + xx) * 4;
                }

                // To grayscale
                function toGrayscale(i) {
                    return Math.round(
                        vis.img_data.orig.data[i] * 0.2126
                        + vis.img_data.orig.data[i + 1] * 0.7152
                        + vis.img_data.orig.data[i + 2] * 0.0722
                    );
                }

                // To Pixel vals
                function returnPixel(arr) {
                    if (x >= 0 && x < vis.img_data.orig.width - 1 && y >= 0 && y < vis.img_data.orig.height - 1) {
                        return (arr[0][0] * toGrayscale(getPxLoc(x - 1, y - 1)))
                            + (arr[0][1] * toGrayscale(getPxLoc(x, y - 1)))
                            + (arr[0][2] * toGrayscale(getPxLoc(x + 1, y - 1)))
                            + (arr[1][0] * toGrayscale(getPxLoc(x - 1, y)))
                            + (arr[1][1] * toGrayscale(getPxLoc(x, y)))
                            + (arr[1][2] * toGrayscale(getPxLoc(x + 1, y)))
                            + (arr[2][0] * toGrayscale(getPxLoc(x - 1, y + 1)))
                            + (arr[2][1] * toGrayscale(getPxLoc(x, y + 1)))
                            + (arr[2][2] * toGrayscale(getPxLoc(x + 1, y + 1)));
                    }
                    return 0;
                }

                const pixel_x = returnPixel(sobel_x);
                const pixel_y = returnPixel(sobel_y);
                let val = Math.round(Math.sqrt(pixel_x * pixel_x + pixel_y * pixel_y));
                const px_loc = getPxLoc(x, y);
                this.img_data.copy.data.push(this.img_data.orig.data[px_loc], this.img_data.orig.data[px_loc + 1],
                    this.img_data.orig.data[px_loc + 2], this.img_data.orig.data[px_loc + 3])
                this.img_data.copy.data[px_loc] = this.img_data.copy.data[px_loc + 1] = this.img_data.copy.data[px_loc + 2] = val;

                // Magnify
                this.selections.magnifier.update(px_loc, px_loc / 4);
            },
            fill: 'rgba(255, 255, 255, 0)',
            stroke: 'rgba(0, 0, 0, 1)'
        },
        // Grayscale (from some source TODO - check 'rangi' work)
        {
            name: 'fil_grayscale',
            vis_name: 'Grayscale',
            settings: {
                active: 127,
                async: false,
                default: 127,
                loading: false,
                max: 255,
                min: 0,
                step: 1,
                vf: false,
                iter: 'px'
            },
            update: (i, index) => {
                // Perform pixel modification
                const set = this.selections.filter.settings.active;
                const gray = Math.round(
                    this.img_data.copy.data[i] * 0.2126
                    + this.img_data.copy.data[i + 1] * 0.7152
                    + this.img_data.copy.data[i + 2] * 0.0722
                );
                this.img_data.copy.data[i] = this.img_data.copy.data[i + 1] = this.img_data.copy.data[i + 2] = gray;
                // Magnify
                this.selections.magnifier.update(i, index);
            },
            fill: 'rgba(255, 255, 255, 0)',
            stroke: 'rgba(0, 0, 0, 1)'
        },
        // Invert
        {
            name: 'fil_invert',
            vis_name: 'Invert',
            settings: {
                active: 255,
                async: false,
                default: 255,
                loading: false,
                max: 255,
                min: 0,
                step: 1,
                vf: false,
                iter: 'px'
            },
            update: (i, index) => {
                // Perform pixel modification
                const set = this.selections.filter.settings.active;

                function invert(v) {
                    return Math.abs(set - v);
                }

                this.img_data.copy.data[i] = invert(this.img_data.copy.data[i]);
                this.img_data.copy.data[i + 1] = invert(this.img_data.copy.data[i + 1]);
                this.img_data.copy.data[i + 2] = invert(this.img_data.copy.data[i + 2]);
                // Magnify
                this.selections.magnifier.update(i, index);
            },
            fill: 'rgba(255, 255, 255, 0)',
            stroke: 'rgba(0, 0, 0, 1)'
        },
        // Threshold (from NIST)
        {
            name: 'fil_threshold',
            vis_name: 'Threshold',
            settings: {
                active: 127,
                async: false,
                default: 127,
                loading: false,
                max: 255,
                min: 0,
                step: 1,
                vf: false,
                iter: 'px'
            },
            update: (i, index) => {
                // Perform pixel modification
                const set = this.selections.filter.settings.active;
                const sum = (this.img_data.copy.data[i] + this.img_data.copy.data[i + 1]
                    + this.img_data.copy.data[i + 2]) / 3;
                this.img_data.copy.data[i] = this.img_data.copy.data[i + 1] = this.img_data.copy.data[i + 2]
                    = sum < set ? 0 : 255;
                // Magnify
                this.selections.magnifier.update(i, index);
            },
            fill: 'rgba(255, 255, 255, 0)',
            stroke: 'rgba(0, 0, 0, 1)'
        },
        // Gamma (from SO - Deepu and Guffa)
        {
            name: 'fil_gamma',
            vis_name: 'Gamma',
            settings: {
                active: 0.5,
                async: false,
                default: 0.5,
                loading: false,
                max: 5.5,
                min: 0,
                step: 0.1,
                vf: false,
                iter: 'px'
            },
            update: (i, index) => {
                // Perform pixel modification
                const set = this.selections.filter.settings.active;

                function gamma(v) {
                    return 255 * (v / 255) ** (1 / set);
                    // return Math.pow(v / 255, set) * 255;
                }

                this.img_data.copy.data[i] = gamma(this.img_data.copy.data[i]);
                this.img_data.copy.data[i + 1] = gamma(this.img_data.copy.data[i + 1]);
                this.img_data.copy.data[i + 2] = gamma(this.img_data.copy.data[i + 2]);
                // Magnify
                this.selections.magnifier.update(i, index);
            },
            fill: 'rgba(255, 255, 255, 0)',
            stroke: 'rgba(0, 0, 0, 1)'
        },

    ];

    /*
    data_filters
     */
    data_filters = [
        // fil_data_rgb
        {
            data: [],
            name: 'fil_data_rgb',
            vis_name: 'Data RGB',
            settings: {
                active: 1,
                async: false,
                default: 1,
                loading: false,
                max: 1,
                min: 0,
                step: 1,
                vf: true,
                vf_setup: 'vis_data_rgb',
                iter: 'px'
            },
            set_pixel: (px) => {

                // Get pixel data for vis
                let sel = null;
                let diff = 255 * 3;
                let range = 0;
                this.selections.filter.data.forEach(d => {
                    // Measure difference
                    const r_mean = (px.data[0] + +d.r) / 2;
                    const r_diff = px.data[0] - +d.r;
                    const g_diff = px.data[1] - +d.g;
                    const b_diff = px.data[2] - +d.b;
                    const cDiff = Math.sqrt(
                        (2 + r_mean / 256) * r_diff ** 2
                        + 4 * g_diff ** 2
                        + (2 + (255 - r_mean) / 256) * b_diff ** 2
                    );
                    // If smaller difference - TODO: linked to filter lens 'dataRgb' optimization
                    if (cDiff <= diff) {
                        range = diff;
                        diff = cDiff;
                        sel = d;
                    }
                });
                this.lensing.configs.pxData = {
                    sel: sel,
                    sel_range: diff,
                    range: []
                };
            },
            update: (i, index) => {

                // See if matches selected
                let selected = null;
                let diff = 255 * 3;
                // Iterate
                this.selections.filter.data.forEach((d, j) => {
                    const r_mean = (this.img_data.copy.data[i] + +d.r) / 2;
                    const r_diff = this.img_data.copy.data[i] - +d.r;
                    const g_diff = this.img_data.copy.data[i + 1] - +d.g;
                    const b_diff = this.img_data.copy.data[i + 2] - +d.b;
                    const cDiff = Math.sqrt(
                        (2 + r_mean / 256) * r_diff ** 2
                        + 4 * g_diff ** 2
                        + (2 + (255 - r_mean) / 256) * b_diff ** 2
                    );
                    // If smaller difference
                    if (cDiff < diff) {
                        diff = cDiff;
                        selected = d;
                    }
                });
                if (selected.name === this.lensing.configs.pxData.sel.name) {
                    // Push to range
                    this.lensing.configs.pxData.range.push(Math.round(diff));
                    // Update pixel data
                    this.img_data.copy.data[i] = this.lensing.configs.pxData.sel.r;
                    this.img_data.copy.data[i + 1] = this.lensing.configs.pxData.sel.g;
                    this.img_data.copy.data[i + 2] = this.lensing.configs.pxData.sel.b;
                } else {
                    // Update pixel data
                    this.img_data.copy.data[i] = (this.img_data.copy.data[i] + 255) / 2;
                    this.img_data.copy.data[i + 1] = (this.img_data.copy.data[i + 1] + 255) / 2;
                    this.img_data.copy.data[i + 2] = (this.img_data.copy.data[i + 2] + 255) / 2;
                }

                // Magnify
                this.selections.magnifier.update(i, index);
            },
            fill: 'rgba(255, 255, 255, 0)',
            stroke: 'rgba(0, 0, 0, 1)'
        },
    ];

    /*
    magnifiers
     */
    magnifiers = [
        // None
        {
            name: 'mag_standard',
            vis_name: 'Standard',
            settings: {
                active: 1,
                default: 1,
                max: 10,
                min: 1,
                step: 0.5,
                vf: false
            },
            update: (i, index) => {
            },
            fill: 'rgba(255, 255, 255, 0)',
            stroke: 'rgba(0, 0, 0, 1)'
        },
        // Fisheye - from jOloga
        {
            name: 'mag_fisheye',
            vis_name: 'Fisheye',
            settings: {
                active: 1,
                default: 1,
                max: 2,
                min: 1,
                step: 0.5,
                vf: false
            },
            update: (i, index) => {
                // Add to copy index
                this.img_data.copy_indexed.push([
                    this.img_data.copy.data[i],
                    this.img_data.copy.data[i + 1],
                    this.img_data.copy.data[i + 2],
                    this.img_data.copy.data[i + 3]
                ]);

                // Check if at end
                if (i + 4 === this.img_data.orig.data.length) {
                    // Get fisheye result
                    const wh = this.lensing.configs.rad * 2 * this.lensing.configs.mag;
                    const result = fisheye(this.img_data.copy_indexed, wh, wh);
                    // Update copy
                    for (let j = 0; j < result.length; j++) {
                        const reIndex = 4 * j;
                        if (result[j]) {
                            this.img_data.copy.data[reIndex] = result[j][0];
                            this.img_data.copy.data[reIndex + 1] = result[j][1];
                            this.img_data.copy.data[reIndex + 2] = result[j][2];
                            this.img_data.copy.data[reIndex + 3] = result[j][3];
                        }
                    }

                }

                // fisheye()
                function fisheye(srcpixels, w, h) {

                    const dstpixels = srcpixels.slice();

                    for (let y = 0; y < h; y++) {
                        const ny = ((2 * y) / h) - 1;
                        const ny2 = ny * ny;

                        for (let x = 0; x < w; x++) {
                            const nx = ((2 * x) / w) - 1;
                            const nx2 = nx * nx;
                            const r = Math.sqrt(nx2 + ny2);

                            if (0.0 <= r && r <= 1.0) {
                                let nr = Math.sqrt(1.0 - r * r);
                                nr = (r + (1.0 - nr)) / 2.0;

                                if (nr <= 1.0) {
                                    const theta = Math.atan2(ny, nx);
                                    const nxn = nr * Math.cos(theta);
                                    const nyn = nr * Math.sin(theta);
                                    const x2 = Math.round(((nxn + 1) * w) / 2);
                                    const y2 = Math.round(((nyn + 1) * h) / 2);
                                    const srcpos = y2 * w + x2;
                                    if (srcpos >= 0 && srcpos < w * h) {
                                        dstpixels[y * w + x] = srcpixels[srcpos];
                                    }
                                }
                            }
                        }
                    }
                    return dstpixels;
                }
            },
            fill: 'rgba(255, 255, 255, 0)',
            stroke: 'rgba(0, 0, 0, 1)'
        },
        // Plateau
        {
            name: 'mag_plateau',
            vis_name: 'Plateau',
            settings: {
                active: 1.5,
                default: 1.5,
                max: 5,
                min: 1,
                step: 0.5,
                vf: false
            },
            update: (i, index) => {

                // Define this
                const vis = this;

                // Config
                const w = this.img_data.orig.width;
                const preserve = 0.67;

                // Get x, y, and r
                const x = index % w - (w / 2);
                const y = Math.floor(index / w) - (w / 2);
                const r = Math.sqrt(x ** 2 + y ** 2);

                // Get pixels
                if (r < this.lensing.configs.rad * preserve) {
                    this.img_data.copy_indexed.push(
                        this.img_data.copy.data[i],
                        this.img_data.copy.data[i + 1],
                        this.img_data.copy.data[i + 2],
                        this.img_data.copy.data[i + 3]
                    );
                } else if (r <= this.lensing.configs.rad) {
                    // Discover pos of extended radius
                    const rad = Math.atan2(x, y);
                    // Calc new pos
                    vis.tools.plateauScale
                        .domain([vis.lensing.configs.rad * preserve, vis.lensing.configs.rad])
                        .range([vis.lensing.configs.rad * preserve, w / 2]);
                    const add = vis.tools.plateauScale(r);
                    const newX = Math.round(add * Math.sin(rad));
                    const newY = Math.round(add * Math.cos(rad));
                    const col = (newX + w / 2) * 4;
                    const row = (newY + w / 2) * w * 4;
                    const pos = col + row;

                    // Redefine
                    this.img_data.copy_indexed.push(
                        this.img_data.copy.data[pos],
                        this.img_data.copy.data[pos + 1],
                        this.img_data.copy.data[pos + 2],
                        this.img_data.copy.data[pos + 3]
                    );
                } else {
                    this.img_data.copy_indexed.push(
                        0,
                        0,
                        0,
                        255
                    );
                }

                // If last one
                if (i >= w * w * 4 - 4) {
                    this.img_data.copy.data = this.img_data.copy_indexed;
                }

                /*
                function scale(input) {
                    const d = [vis.lensing.configs.rad * preserve, vis.lensing.configs.rad];
                    const r = [vis.lensing.configs.rad * preserve, w / 2];
                    return -((d[1] - input) * (r[1] - r[0]) / (d[1] - d[0]) - r[1]);
                }
                */
            },
        },
    ];

}

/*
 ref.
    + https://stackoverflow.com/questions/17615963/standard-rgb-to-grayscale-conversion
    + https://stackoverflow.com/questions/16521003/gamma-correction-formula-gamma-or-1-gamma
 */
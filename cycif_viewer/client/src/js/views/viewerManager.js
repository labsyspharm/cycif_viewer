import "regenerator-runtime/runtime.js";

/**
 * @class ViewerManager
 */
export class ViewerManager {

    show_sel = false;
    sel_outlines = true;

    /**
     * @constructor
     * Constructs a ColorManager instance before delegating initialization.
     *
     * @param {Object} _viewer
     */
    constructor(_imageViewer, _viewer, _viewerName) {
        this.viewer = _viewer;
        this.imageViewer = _imageViewer;
        this.viewer_name = _viewerName;
        this.viewer_channels = {};

        this.init();
    }

    /**
     * @function init
     * Setups up the color manager.
     *
     * @returns void
     */
    init() {

        // Add event handlers
        this.add_handlers();

        // Set filter options
        this.set_filter_options();

        // Load label image
        this.load_label_image();

    }

    /**
     * @function add_handlers
     * Adds relevant event handlers to the viewer
     *
     * @returns void
     */
    add_handlers() {

        // Add event load handlers
        this.viewer.addHandler('tile-loaded', this.imageViewer.tileLoaded.bind(this.imageViewer));
        this.viewer.addHandler('tile-unloaded', this.imageViewer.tileUnloaded.bind(this.imageViewer));
    }

    /**
     * @function channel_add
     * Add channel to multi-channel rendering
     *
     * @param srcIdx
     */
    channel_add(srcIdx) {

        // If already exists
        if ((srcIdx in this.imageViewer.currentChannels)) {
            return;
        }

        // Get dzi path
        const src = this.imageViewer.config["imageData"][srcIdx]["src"];

        // Find name
        let name = '';
        let name_short = '';
        for (let k in imageChannels) {
            if (imageChannels.hasOwnProperty(k) && imageChannels[k] === srcIdx) {
                name = k;
                name_short = dataLayer.getShortChannelName(k);
            }
        }

        let maxLevel = this.imageViewer.config['maxLevel'] - 1;

        // Add tiled image
        this.viewer.addTiledImage({
            tileSource: {
                height: this.imageViewer.config['height'],
                width: this.imageViewer.config['width'],
                maxLevel: maxLevel,
                tileWidth: this.imageViewer.config['tileWidth'],
                tileHeight: this.imageViewer.config['tileHeight'],
                getTileUrl: function (level, x, y) {
                    return `${src}${maxLevel - level}/${x}_${y}.png`
                }
            },
            // index: 0,
            opacity: 1,
            preload: true,
            success: () => {
                // Define url and suburl
                const itemidx = this.viewer.world.getItemCount() - 1;
                this.viewer.world.getItemAt(itemidx).source['channelUrl'] = src
                const url = src;
                const group = url.split("/");
                const sub_url = group[group.length - 2];
                // Attach
                this.imageViewer.currentChannels[srcIdx] = {"url": url, "sub_url": sub_url};
                this.viewer_channels[srcIdx] = {"url": url, "sub_url": sub_url, 'name': name, 'short_name': name_short};
            }
        });
    }

    /**
     * @function channel_remove
     * Remove channel from multichannel rendering
     *
     * @param srcIdx
     */
    channel_remove(srcIdx) {

        const src = this.imageViewer.config["imageData"][srcIdx]["src"];

        const img_count = this.viewer.world.getItemCount();

        // remove channel
        if ((srcIdx in this.imageViewer.currentChannels)) {

            // remove channel - first find it
            for (let i = 0; i < img_count; i = i + 1) {
                const url = this.viewer.world.getItemAt(i).source['channelUrl'];
                if (url === this.imageViewer.currentChannels[srcIdx]["url"]) {

                    this.viewer.world.removeItem(this.viewer.world.getItemAt(i));

                    delete this.imageViewer.currentChannels[srcIdx];
                    delete this.viewer_channels[srcIdx];
                    break;
                }
            }
        }
    }


    /**
     * @function evaluateTF
     *
     * @param val
     * @param tf
     * @returns {*}
     */
    evaluateTF(val, tf) {

        let lerpFactor = Math.round(((val - tf.min) / (tf.max - tf.min)) * (tf.num_bins - 1));

        if (lerpFactor >= tf.num_bins) {
            lerpFactor = tf.num_bins - 1;
        }

        if (lerpFactor < 0) {
            lerpFactor = 0;
        }

        return tf.tf[lerpFactor];
    }

    /**
     * @function force_repaint
     *
     * @returns void
     */
    force_repaint() {

        // Refilter, redraw
        this.viewer.forceRefilter();
        this.viewer.forceRedraw();
    }

    /**
     * @function load_label_image
     *
     * @returns void
     */
    load_label_image() {

        // Load label image in background if it exists
        if (this.imageViewer.config["imageData"][0]["src"] && this.imageViewer.config["imageData"][0]["src"] !== '') {
            let url = this.imageViewer.config["imageData"][0]["src"];
            let maxLevel = this.imageViewer.config['maxLevel'] - 1;
            this.viewer.addTiledImage({
                tileSource: {
                    height: this.imageViewer.config['height'],
                    width: this.imageViewer.config['width'],
                    maxLevel: maxLevel,
                    tileWidth: this.imageViewer.config['tileWidth'],
                    tileHeight: this.imageViewer.config['tileHeight'],
                    getTileUrl: function (level, x, y) {
                        return `${url}${maxLevel - level}/${x}_${y}.png`
                    }
                },
                index: 0,
                opacity: 1,
                success: () => {
                    const url0 = url
                    this.viewer.world.getItemAt(0).source['channelUrl'] = url;
                    this.imageViewer.labelChannel["url"] = url0;
                    const group = url0.split("/");
                    this.imageViewer.labelChannel["sub_url"] = group[group.length - 2];
                }
            });
        } else {
            this.imageViewer.noLabel = true;
        }
    }

    /** TODO - want to remove but need to discuss why these sister methods exist
     * @function renderTFWithLabels
     * Called by filtering plugin, applies TF on single tile, also accesses the label image
     *
     * @param context
     * @param callback
     * @param tile
     * @returns {Promise<void>}
     */
    async renderTFWithLabels(context, callback, tile) {

        // If no tile
        if (tile === null) {
            callback();
            return;
        }

        // If no tile in cache
        const inputTile = this.imageViewer.tileCache[tile.url];
        if (inputTile === null) {
            callback();
            return;
        }

        // If multi-channel image
        if (Object.keys(seaDragonViewer.currentChannels).length > 1) {
            await this.renderTFWithLabelsMulti(context, callback, tile);
            return;
        }

        // Render single-channel image
        const group = tile.url.split("/");
        const somePath = group[group.length - 3];

        // Label data
        let labelTile = '';
        let labelTileAdr = '';
        if (!this.imageViewer.noLabel) {
            const labelPath = this.imageViewer.labelChannel["sub_url"];
            labelTileAdr = tile.url.replace(somePath, labelPath);
            labelTile = this.imageViewer.tileCache[labelTileAdr];
        }

        // Retrieve channel data
        let channelIdx = "";
        for (let key in this.imageViewer.currentChannels) {
            channelIdx = key;
            break;
        }
        if (channelIdx === "") {
            return;
        }
        const channelPath = this.imageViewer.currentChannels[channelIdx]["sub_url"];
        const channelTileAdr = tile.url.replace(somePath, channelPath);
        const channelTile = this.imageViewer.tileCache[channelTileAdr];

        if (channelTile === null || !channelTile) {
            return;
        }
        const channelTileData = channelTile.data;
        const tf = this.imageViewer.channelTF[channelIdx];

        // Get screen pixels to write into
        const screenData = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
        const pixels = screenData.data;

        // Initialize
        let labelValue = 0;
        let labelValueStr = "";
        let channelValue = 0;
        let rgb = 0;

        // If label tile has not loaded, asynchronously load it, waiting for it to load before proceeding
        if (labelTile === null && !this.imageViewer.noLabel) {
            const loaded = await addTile(labelTileAdr);
            labelTile = this.imageViewer.tileCache[labelTileAdr];
        }

        // Check if there is a label present
        const labelTileData = _.get(labelTile, 'data');

        // Iterate over all tile pixels
        for (let i = 0, len = inputTile.width * inputTile.height * 4; i < len; i = i + 4) {

            // Get 24bit label data
            if (labelTileData) {
                labelValue = ((labelTileData[i] * 65536) + (labelTileData[i + 1] * 256) + labelTileData[i + 2]) - 1;
                labelValueStr = labelValue.toString();
            }

            // Get 16 bit data (stored in G and B channels)
            channelValue = (channelTileData[i + 1] * 256) + channelTileData[i + 2];

            // Apply color transfer function
            rgb = this.evaluateTF(channelValue, tf);

            // Eval rendering
            if (this.imageViewer.show_subset) {

                // Show data as black/white
                pixels[i] = channelTileData[i + 1];
                pixels[i + 1] = channelTileData[i + 1];
                pixels[i + 2] = channelTileData[i + 1];

            } else {

                // Render everything with TF
                if (channelValue < tf.min) {
                    // values lower than TF gating: 0
                    pixels[i] = 0;
                    pixels[i + 1] = 0;
                    pixels[i + 2] = 0;
                } else {
                    // values higher than TF gating: highest TF color
                    pixels[i] = rgb.r;
                    pixels[i + 1] = rgb.g;
                    pixels[i + 2] = rgb.b;
                }
            }

            // Check for label data
            if (labelValue >= 0) {
                if (this.imageViewer.show_subset) {
                    // Render subset with TF (check label id is in subset, apply TF)
                    if (this.imageViewer.data.has(labelValue)) {
                        if (channelValue < tf.min) {
                            pixels[i] = 0;
                            pixels[i + 1] = 0;
                            pixels[i + 2] = 0;
                        } else {
                            pixels[i] = rgb.r;
                            pixels[i + 1] = rgb.g;
                            pixels[i + 2] = rgb.b;
                        }
                    }
                }

                // Render selection ids as highlighted
                if ((this.imageViewer.show_selection || this.show_sel) && this.imageViewer.selection.size > 0) {
                    if (this.imageViewer.selection.has(labelValue)) {
                        let phenotype = _.get(seaDragonViewer.selection.get(labelValue), 'phenotype', '');
                        let color = seaDragonViewer.colorScheme.colorMap[phenotype].rgb;
                        // let color = [255, 255, 255]

                        /************************ new */
                            // Init grid and tests (4 pts v 8 working for now)
                        const grid = [
                                i - 4,
                                i + 4,
                                i - inputTile.width * 4,
                                i + inputTile.width * 4
                            ];
                        const test = [
                            i % (inputTile.width * 4) !== 0,
                            i % (inputTile.width * 4) !== (inputTile.width - 1) * 4,
                            i >= inputTile.width * 4,
                            i < inputTile.width * 4 * (inputTile.height - 1)
                        ];

                        // If outline
                        if (this.sel_outlines) {
                            // Iterate grid
                            for (let j = 0; j < grid.length; j++) {
                                // if pass test (not on tile border)
                                if (test[j]) {
                                    // Neighbor label value
                                    const altLabelValue = ((labelTileData[grid[j]] * 65536)
                                        + (labelTileData[grid[j] + 1] * 256) + labelTileData[grid[j] + 2]) - 1;
                                    const altLabelValueStr = altLabelValue.toString();
                                    // Color
                                    if (altLabelValueStr !== labelValueStr) {
                                        pixels[i] = color[0];
                                        pixels[i + 1] = color[1];
                                        pixels[i + 2] = color[2];
                                        break;
                                    }
                                }
                            }
                        } else {
                            pixels[i] = color[0];
                            pixels[i + 1] = color[1];
                            pixels[i + 2] = color[2];
                        }
                        /************************ newend */
                    }
                }
            }


        }

        context.putImageData(screenData, 0, 0);
        callback();
    }

    /**
     * @function renderTFWithLabelsMulti
     * Apply TF on multi-channel tile, also accesses the label image
     *
     * @param context
     * @param callback
     * @param tile
     * @returns {Promise<void>}
     */
    async renderTFWithLabelsMulti(context, callback, tile) {

        // Ck for tile
        if (tile == null) {
            callback();
            return;
        }

        // Ck tile cache
        const inputTile = this.imageViewer.tileCache[tile.url];
        if (inputTile == null) {
            callback();
            return;
        }

        // Render multi-channel image
        const group = tile.url.split("/");
        const somePath = group[group.length - 3];

        // Label data
        let labelTileAdr = '';
        let labelTile = '';
        if (!this.imageViewer.noLabel) {
            const labelPath = this.imageViewer.labelChannel["sub_url"];
            labelTileAdr = tile.url.replace(somePath, labelPath);
            labelTile = this.imageViewer.tileCache[labelTileAdr];
        }

        // Channel data
        const channelsTileData = [];
        const tfs = [];
        const tfs_min = [];
        const tileurl = tile.url;

        // Get tfs for channels
        for (const key in this.viewer_channels) {

            const channelIdx = key;

            const channelPath = this.viewer_channels[channelIdx]["sub_url"];
            const channelTileAdr = tileurl.replace(somePath, channelPath);
            const channelTile = this.imageViewer.tileCache[channelTileAdr];

            if (channelTile == null) {
                return;
            }

            channelsTileData.push(channelTile.data);
            tfs.push(this.imageViewer.channelTF[channelIdx]);
            tfs_min.push(this.imageViewer.channelTF[channelIdx].min);
        }

        // get screen pixels to write into
        const screenData = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
        const pixels = screenData.data;

        // If label tile has not loaded, asynchronously load it, waiting for it to load before proceeding
        if (labelTile == null && !this.imageViewer.noLabel) {
            const loaded = await addTile(labelTileAdr);
            labelTile = this.imageViewer.tileCache[labelTileAdr];
        }

        // Init
        const labelTileData = _.get(labelTile, 'data');
        let labelValue = 0;
        let labelValueStr = "";
        let channelValue = 0;
        let rgb = 0;

        // iterate over all tile pixels
        for (let i = 0, len = inputTile.width * inputTile.height * 4; i < len; i = i + 4) {

            pixels[i] = 0;
            pixels[i + 1] = 0;
            pixels[i + 2] = 0;

            // Get 24bit label data
            if (labelTileData) {
                labelValue = ((labelTileData[i] * 65536) + (labelTileData[i + 1] * 256) + labelTileData[i + 2]) - 1;
                labelValueStr = labelValue + ''; //faster than labelValue.toString()
            }

            // Iterate over all image channels
            for (let channel = 0; channel < channelsTileData.length; channel++) {

                // get 16 bit image data (stored in G and B channels)
                channelValue = (channelsTileData[channel][i + 1] * 256) + channelsTileData[channel][i + 2];

                // apply TF
                rgb = this.evaluateTF(channelValue, tfs[channel]);

                if (!this.imageViewer.show_subset) { // render everything with TF
                    if (channelValue >= tfs_min[channel]) {
                        pixels[i] += rgb.r;
                        pixels[i + 1] += rgb.g;
                        pixels[i + 2] += rgb.b;
                    }
                }

                // render subset with TF
                if (this.imageViewer.show_subset) {
                    // render with TF
                    if (this.imageViewer.data.has(labelValue)) {
                        if (channelValue >= tfs[channel].min) {
                            pixels[i] += rgb.r;
                            pixels[i + 1] += rgb.g;
                            pixels[i + 2] += rgb.b;
                        }
                    } else {
                        // render data as black/white
                        pixels[i] += channelsTileData[channel][i + 1];
                        pixels[i + 1] += channelsTileData[channel][i + 1];
                        pixels[i + 2] += channelsTileData[channel][i + 1];
                    }
                }

                // Render selection ids as highlighted
                if ((this.imageViewer.show_selection || this.show_sel) && this.imageViewer.selection.size > 0) {
                    if (this.imageViewer.selection.has(labelValue)) {
                        // let phenotype = _.get(seaDragonViewer.selection.get(labelValueStr), 'phenotype', '');
                        // let color = seaDragonViewer.colorScheme.colorMap[phenotype].rgb;
                        let color = [255, 255, 255]

                        /************************ new */
                            // Init grid and tests (4 pts v 8 working for now)
                        const grid = [
                                i - 4,
                                i + 4,
                                i - inputTile.width * 4,
                                i + inputTile.width * 4
                            ];
                        const test = [
                            i % (inputTile.width * 4) !== 0,
                            i % (inputTile.width * 4) !== (inputTile.width - 1) * 4,
                            i >= inputTile.width * 4,
                            i < inputTile.width * 4 * (inputTile.height - 1)
                        ];

                        // If outline
                        if (this.sel_outlines) {
                            // Iterate grid
                            for (let j = 0; j < grid.length; j++) {
                                // if pass test (not on tile border)
                                if (test[j]) {
                                    // Neighbor label value
                                    const altLabelValue = ((labelTileData[grid[j]] * 65536)
                                        + (labelTileData[grid[j] + 1] * 256) + labelTileData[grid[j] + 2]) - 1;
                                    const altLabelValueStr = altLabelValue.toString();
                                    // Color
                                    if (altLabelValueStr !== labelValueStr) {
                                        pixels[i] = 255;
                                        pixels[i + 1] = 255;
                                        pixels[i + 2] = 255;
                                        break;
                                    }
                                }
                            }
                        } else {
                            pixels[i] = color[0];
                            pixels[i + 1] = color[1];
                            pixels[i + 2] = color[2];
                        }
                        /************************ newend */
                    }
                }

            }
        }

        context.putImageData(screenData, 0, 0);
        callback();

    }

    /**
     * @function set_filter_options
     * Sets ImageViewer filter
     *
     * @returns void
     */
    set_filter_options() {
        this.viewer.setFilterOptions({
            filters: {
                processors: this.renderTFWithLabels.bind(this)
            }
        });
    }


}
import "regenerator-runtime/runtime.js";

/**
 * @class ViewerManager
 */
export class ViewerManager {


    /**
     * @constructor
     * Constructs a ColorManager instance before delegating initialization.
     *
     * @param {Object} _viewer
     */
    constructor(_imageViewer, _viewer) {
        this.viewer = _viewer;
        this.imageViewer = _imageViewer;

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
        this.viewer.addHandler('tile-loaded', this.tileLoaded.bind(this));
        this.viewer.addHandler('tile-unloaded', this.tileUnloaded.bind(this));
    }

    /**
     * @function load_label_image
     *
     *
     * @returns void
     */
    load_label_image() {

        // Load label image in background if it exists
        if (this.imageViewer.config["imageData"][0]["src"] && this.imageViewer.config["imageData"][0]["src"] != '') {
            this.viewer.addTiledImage({
                tileSource: this.imageViewer.config["imageData"][0]["src"],
                index: 0,
                opacity: 1,
                success: () => {
                    const url0 = this.viewer.world.getItemAt(0).source.tilesUrl;
                    this.imageViewer.labelChannel["url"] = url0;
                    const group = url0.split("/");
                    this.imageViewer.labelChannel["sub_url"] = group[group.length - 2];
                }
            });
        } else {
            this.imageViewer.noLabel = true;
        }
    }

    /**
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
            await this.imageViewer.renderTFWithLabelsMulti(context, callback, tile);
            return;
        }

        // Render single-channel image
        const group = tile.url.split("/");
        const somePath = group[group.length - 3];

        // Label data
        let labelTile = null;
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
            // console.log("Missing Label Tile", labelTileAdr)
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
            rgb = evaluateTF(channelValue, tf);

            // Eval rendering
            if (seaDragonViewer.show_subset) {

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
                    if (this.imageViewer.data.has(labelValueStr)) {
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
                if (this.imageViewer.show_selection) {
                    if (this.imageViewer.selection.has(labelValueStr)) {
                        const phenotype = _.get(this.imageViewer.selection.get(labelValueStr), 'phenotype', '');
                        const color = this.imageViewer.colorScheme.getPhenotypeColor(phenotype)
                        if (color !== undefined) {
                            pixels[i] = color[0];
                            pixels[i + 1] = color[1];
                            pixels[i + 2] = color[2];
                        }
                    }
                }
            }


        }

        context.putImageData(screenData, 0, 0);
        callback();

        /*
        evaluateTF
         */
        function evaluateTF(val, tf) {

            let lerpFactor = Math.round(((val - tf.min) / (tf.max - tf.min)) * (tf.num_bins - 1));

            if (lerpFactor >= tf.num_bins) {
                lerpFactor = tf.num_bins - 1;
            }

            if (lerpFactor < 0) {
                lerpFactor = 0;
            }

            return tf.tf[lerpFactor];
        }
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


    /**
     * @function tileLoaded
     * Raised when tile loaded with openSeaDragon, we want to store it locally so we can access it later (to manually filter, etc.)
     *
     * @param event
     */
    tileLoaded(event) {

        if (event === null || event === undefined || event.tileRequest === null) {
            return;
        }

        const handlePngAs8Bit = false;
        if (handlePngAs8Bit) {
            const img = new Image();
            img.onload = () => {

                const tile = event.tile;
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                // This gets back an 8 bit RGBA image
                this.imageViewer.tileCache[img.src] = ctx.getImageData(0, 0, img.width, img.height);

            };
            img.src = event.tile.url;

        } else {

            // Full 24bit png handling: get buffer, parse it into png, save in cache
            const buffer = new Buffer(event.tileRequest.response);
            if (buffer) {
                const tile = event.tile;

                // Save tile in tileCache
                this.imageViewer.tileCache[tile.url] = PNG.sync.read(buffer, {colortype: 0});
            } else {
                // console.log('[TILE LOADED]: buffer UNDEFINED');
            }
        }
    }


    /**
     * @function tileUnloaded
     * Raised when tile is being unloaded by openSeaDragon; we also purge it from local tile cache
     *
     * @param event
     */
    tileUnloaded(event) {

        //// console.log('[TILE UNLOADED LOADED]: url:', event.tile.url, 'value:', seaDragonViewer.tileCounter[event.tile.url]);
        seaDragonViewer.tileCache[event.tile.url] = null;

    }


}
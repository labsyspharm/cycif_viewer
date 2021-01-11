/**
 * viewer.js.
 *
 * ImageViewer for CyCif data based on OpenSeadragon.
 *
 */

/* todo
 1. major - the viewer managers should not be looking up the same renderTF
 */

class ImageViewer {

    // Vars
    viewerManagers = [];

    constructor(config, dataLayer, eventHandler, colorScheme) {

        this.config = config;
        this.eventHandler = eventHandler;
        this.dataLayer = dataLayer;
        this.colorScheme = colorScheme;

        // Viewer
        this.viewer = {};

        // OSD plugins

        // Local storage of image tiles (for all loaded channels)
        this.tileCache = {};
        // Stores the ordered contents of the tile cache, so that once we hit max size we remove oldest elements
        this.tileCacheQueue = []

        // Map of selected ids, key is id
        this.selection = new Map();
        this.data = new Map();

        // Currently loaded image / label channels
        this.currentChannels = {};
        this.labelChannel = {};
        this.noLabel = false;

        // Selection polygon (array of xy positions)
        this.selectionPolygonToDraw = [];

        // Transfer function constant
        this.numTFBins = 1024;

        // Transfer function per channel (min,max, start color, end color)
        this.channelTF = [];
        for (let i = 0; i < this.config["imageData"].length; i = i + 1) {

            const start_color = d3.rgb(0, 0, 0);
            const end_color = d3.rgb(255, 255, 255);

            const tf_def = this.createTFArray(0, 65535, start_color, end_color, this.numTFBins);
            tf_def.name = this.config['imageData'][i].name;

            this.channelTF.push(tf_def);
        }

        // Applying TF to selection, subset, or all
        this.show_subset = false;
        this.show_selection = true;
        this.lassoButton = document.getElementById("lasso_button");
        this.selectButton = document.getElementById("select_button");
        this.neighborhoodButton = document.getElementById("neighborhood_icon");
        this.similaritySlider = document.getElementById("similarity_group");
        this.similaritySlider.onchange = (e) => {
            let val = document.getElementById("neighborhood_similarity").value;
            let span = document.getElementById('similarity_val');
            span.innerHTML = ''
            span.innerHTML = _.toString((val / 100).toFixed(2));
        }
        this.lassoButton.style.color = "orange";
        this.isSelectionToolActive = true;

    }

    /**
     * @function init
     */
    init() {

        // Define this as that
        const that = this;

        // Hide Loader
        document.getElementById('openseadragon_loader').style.display = "none";

        // Config viewer
        const viewer_config = {
            id: "openseadragon",
            maxZoomPixelRatio: 15,
            showFullPageControl: false,
            zoomInButton: "zoom-in",
            zoomOutButton: "zoom-out",
            homeButton: "home",
            imageLoaderLimit: 3,
            loadTilesWithAjax: true,
            immediateRender: false,
            maxImageCacheCount: 150,
            timeout: 90000,
            preload: false,
            homeFillsViewer: true,
            visibilityRatio: 1.0
        };

        // Instantiate viewer
        that.viewer = OpenSeadragon(viewer_config);

        /************************************************************************************* Create viewer managers */

        // Instantiate viewer managers
        that.viewerManagerVMain = new ViewerManager(that, that.viewer, 'main');

        // Append to viewers
        that.viewerManagers.push(that.viewerManagerVMain);

        /*********/
        that.svg_overlay = that.viewer.svgOverlay()
        that.overlay = d3.select(that.svg_overlay.node())

        //SELECTION POLYGON (LASSO)
        that.polygonSelection = [];
        that.renew = false;
        that.numCalls = 0; //defines how fine-grained the polygon resolution is (0 = no subsampling, 10=high subsampling)
        that.lassoing = false;
        that.lasso_draw = function (event) {
            //add points to polygon and (re)draw
            let webPoint = event.position;
            if (that.numCalls % 5 == 0) {
                // Convert that to viewport coordinates, the lingua franca of OpenSeadragon coordinates.
                let viewportPoint = that.viewer.viewport.pointFromPixel(webPoint);
                // Convert from viewport coordinates to image coordinates.
                let imagePoint = that.viewer.world.getItemAt(0).viewportToImageCoordinates(viewportPoint);
                that.polygonSelection.push({'imagePoints': imagePoint, 'viewportPoints': viewportPoint});
            }

            d3.select('#selectionPolygon').remove();
            var selPoly = that.overlay.selectAll("selectionPolygon").data([that.polygonSelection]);
            selPoly.enter().append("polygon")
                .attr('id', 'selectionPolygon')
                .attr("points", function (d) {
                    return d.map(function (d) {
                        return [d.viewportPoints.x, d.viewportPoints.y].join(",");
                    }).join(" ");
                })
            that.numCalls++;
        }

        that.lasso_end = function (event) {
            that.renew = true;

        }

        let primaryTracker = new OpenSeadragon.MouseTracker({
            element: that.viewer.canvas,
            pressHandler: (event) => {
                if (event.originalEvent.shiftKey) {
                    this.viewer.setMouseNavEnabled(false);
                    if (that.isSelectionToolActive) {
                        that.lassoing = true;
                    } else {
                    }
                    if (!that.isSelectionToolActive) {
                        d3.select('#selectionPolygon').remove();

                    }
                    that.polygonSelection = [];
                    that.numCalls = 0;
                }
            }, releaseHandler: (event) => {
                this.viewer.setMouseNavEnabled(true);
                if (that.lassoing) {
                    that.lassoing = false;
                    console.log('release');
                    if (that.isSelectionToolActive) {
                        that.lasso_end(event);
                        if (_.size(that.polygonSelection) > 2) {
                            return dataLayer.getCellsInPolygon(that.polygonSelection, false)
                                .then(cells => {
                                    d3.select('#selectionPolygon').remove();
                                    that.eventHandler.trigger(ImageViewer.events.displaySelection, cells);
                                })
                        }
                    } else {
                        const webPoint = event.position;
                        // Convert that to viewport coordinates, the lingua franca of OpenSeadragon coordinates.
                        const viewportPoint = that.viewer.viewport.pointFromPixel(webPoint);
                        // Convert from viewport coordinates to image coordinates.
                        const imagePoint = that.viewer.world.getItemAt(0).viewportToImageCoordinates(viewportPoint);
                        return that.dataLayer.getNearestCell(imagePoint.x, imagePoint.y)
                            .then(selectedItem => {
                                if (selectedItem !== null && selectedItem !== undefined) {
                                    // Check if user is doing multi-selection or not
                                    let clearPriors = true;
                                    if (event.originalEvent.ctrlKey) {
                                        clearPriors = false;
                                    }
                                    // Trigger event
                                    that.eventHandler.trigger(ImageViewer.events.imageClickedMultiSel, {
                                        selectedItem,
                                        clearPriors
                                    });
                                }
                            })
                    }
                }
            }, moveHandler: function (event) {
                if (that.isSelectionToolActive && that.lassoing) {
                    that.lasso_draw(event);
                }
            }
        })


        //some resizing corrections
        d3.select(window).on('resize', function () {
        });
        that.svg_overlay.resize();

        /********************************************************************************************** Emulate click */

        // Click first from channel list
        // document.querySelector('.channel-list-content').click();

        /******************************************************************************************** Back to normal  */
        // OpenSeadragonCanvasOverlayHd: add canvas overlay - drawing selection rectangles
        this.canvasOverlay = new OpenSeadragon.CanvasOverlayHd(this.viewer, {
            onRedraw: function (opts) {
                const context = opts.context;
                //area selection polygon
                if (that.selectionPolygonToDraw && that.selectionPolygonToDraw.length > 0) {
                    var d = that.selectionPolygonToDraw;
                    context.globalAlpha = 0.7;
                    context.strokeStyle = 'orange';
                    context.lineWidth = 10;
                    context.beginPath();
                    d.forEach(function (xVal, i) {
                        if (i === 0) {
                            context.moveTo(d[i].x, d[i].y);
                        } else {
                            context.lineTo(d[i].x, d[i].y);
                        }
                    });
                    context.closePath();
                    context.stroke();
                    // context.globalAlpha = 1.0;
                }
            },
        });

        that.lassoButton.addEventListener("click", () => {
            that.lassoButton.style.color = "orange";
            that.selectButton.style.color = "#8f8f8f";
            that.neighborhoodButton.style.stroke = "#8f8f8f";
            that.isSelectionToolActive = true;
        })

        that.selectButton.addEventListener("click", () => {
            that.selectButton.style.color = "orange";
            that.lassoButton.style.color = "#8f8f8f";
            that.neighborhoodButton.style.stroke = "#8f8f8f";
            that.isSelectionToolActive = false;
        })
        that.neighborhoodButton.addEventListener("contextmenu", event => {
            let display = that.similaritySlider.style.display;
            if (display == "none") {
                that.similaritySlider.style.display = "block";
            } else {
                that.similaritySlider.style.display = "none";
            }
        })
        that.neighborhoodButton.addEventListener("click", event => {
            let color = that.neighborhoodButton.style.stroke;
            d3.select('#selectionPolygon').remove();
            if (color == "orange") { //
                that.neighborhoodButton.style.stroke = "#8f8f8f";
            } else {
                that.neighborhoodButton.style.stroke = "orange";
                let sim = document.getElementById('similarity_val').innerHTML || '0.8';
                let simVal = parseFloat(sim);
                if (dataLayer.getCurrentSelection().size > 0) {
                    return dataLayer.getSimilarNeighborhoodToSelection(simVal)
                        .then(cells => {
                            that.eventHandler.trigger(ImageViewer.events.displayNeighborhoodSelection, cells);
                        })
                }
            }
        })

    }

    /**
     * @function actionFocus
     *
     * @param vp
     *
     * @returns void
     */
    actionFocus(vp) {
        this.setViewPort(vp.x, vp.y, vp.width, vp.height);
    }

    /**
     * @function setViewport
     *
     * @param {int} x
     * @param {int} y
     * @param {int} width
     * @param {int} height
     *
     * @returns void
     */
    setViewPort(x, y, width, height) {

        // Calc from main viewer
        const coords = this.viewer.viewport.imageToViewportCoordinates(x, y);
        const lowerBounds = this.viewer.viewport.imageToViewportCoordinates(width, height);
        const box1 = new OpenSeadragon.Rect(coords.x, coords.y, lowerBounds.x, lowerBounds.y);

        // Apply to all viewers
        this.viewerManagers.forEach(vM => {
            vM.viewer.viewport.fitBounds(box1);
        });
    }

    // =================================================================================================================
    // Tile cache management
    // =================================================================================================================

    createTFArray(min, max, rgb1, rgb2, numBins) {

        const tfArray = [];

        const numBinsF = parseFloat(numBins);
        const col1 = d3.rgb(rgb1);
        const col2 = d3.rgb(rgb2);

        for (let i = 0; i < numBins; i++) {
            const rgbTupel = {};
            const lerpFactor = (i / (numBinsF - 1.0));

            rgbTupel.r = col1.r + (col2.r - col1.r) * lerpFactor;
            rgbTupel.g = col1.g + (col2.g - col1.g) * lerpFactor;
            rgbTupel.b = col1.b + (col2.b - col1.b) * lerpFactor;

            const lerpCol = d3.rgb(rgbTupel.r, rgbTupel.g, rgbTupel.b);
            tfArray.push(lerpCol);
        }

        return {
            min: min, max: max, start_color: rgb1, end_color: rgb2,
            num_bins: numBins,
            tf: tfArray
        }
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

                this.addToTileCache(img.src, ctx.getImageData(0, 0, img.width, img.height));

            };
            img.src = event.tile.url;

        } else {

            // Full 24bit png handling: get buffer, parse it into png, save in cache
            if (event.tileRequest) {
                const buffer = new Buffer(event.tileRequest.response);
                if (buffer) {
                    const tile = event.tile;

                    // Save tile in tileCache

                    this.addToTileCache(tile.url, PNG.sync.read(buffer, {colortype: 0}))
                } else {
                    // console.log('[TILE LOADED]: buffer UNDEFINED');
                }
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
        this.removeTileFromCache(event.tile.url)

    }

    removeTileFromCache(tileName) {
        if (this.tileCache.hasOwnProperty(tileName)) {
            console.log("Removing from Tile Cache");
            // this.tileCache[tileName] = null;
        }
    }

    addToTileCache(tileName, data) {
        let cacheSize = this.tileCacheQueue.push(tileName)
        if (cacheSize > this.viewer.maxImageCacheCount) {
            let tileToRemove = this.tileCacheQueue.shift();
            this.removeTileFromCache(tileToRemove);
        }
        this.tileCache[tileName] = data;
    }

    // =================================================================================================================
    // Rendering
    // =================================================================================================================

    /**
     *
     *
     * @param radius
     * @param selection
     * @param dragging
     */
    drawCellRadius(radius, selection, dragging = false) {

        let x = selection[dataLayer.x];
        let y = selection[dataLayer.y];
        let imagePoint = this.viewer.world.getItemAt(0).imageToViewportCoordinates(x, y);
        let circlePoint = this.viewer.world.getItemAt(0).imageToViewportCoordinates(x + _.toNumber(radius), y);
        let viewportRadius = Math.abs(circlePoint.x - imagePoint.x);
        let overlay = seaDragonViewer.viewer.svgOverlay();
        let fade = 0;
        // When dragging the bar, don't fade out
        if (dragging) {
            fade = 1;
        }

        let circle = d3.select(overlay.node())
            .selectAll('.radius-circle')
            .interrupt()
            .data([{'x': imagePoint.x, 'y': imagePoint.y, 'r': viewportRadius}])
        circle.enter()
            .append("circle")
            .attr("class", "radius-circle")
            .merge(circle)
            .attr("cx", d => {
                return d.x;
            })
            .attr("cy", d => {
                return d.y;
            })
            .attr("r", d => {
                return d.r;
            })
            .style("opacity", 1)
            .transition()
            .duration(1000)
            .ease(d3.easeLinear)
            .style("opacity", fade);
        circle.exit().remove();

    }

    /**
     * @function forceRepaint
     *
     * @returns void
     */
    forceRepaint() {
        // Refilter, redraw
        this.viewerManagers.forEach(vM => {
            vM.viewer.forceRefilter();
            vM.viewer.forceRedraw();
        });
    }

    /**
     * @function updateActiveChannels
     *
     * @param name
     * @param selection
     * @param status
     *
     * @returns void
     */
    updateActiveChannels(name, selection, status) {

        const channelIdx = imageChannels[name];

        if (selection.length === 0) {
            // console.log('nothing selected - keep showing last image');
            // return;
        } else if (selection.length === 1) {
            // console.log('1 channel selected');
        } else {
            // console.log('multiple channels selected');
        }

        if (status) {
            this.viewerManagers.forEach(vM => {
                vM.channel_add(channelIdx);
            });
        } else {
            this.viewerManagers.forEach(vM => {
                vM.channel_remove(channelIdx);
            });
        }

        this.forceRepaint();
    }

    /**
     * @function updateChannelRange
     *
     * @param name
     * @param tfmin
     * @param tfmax
     *
     * @returns void
     */
    updateChannelRange(name, tfmin, tfmax) {

        const channelIdx = imageChannels[name];

        const min = tfmin;
        const max = tfmax;
        const rgb1 = this.channelTF[channelIdx].start_color;
        const rgb2 = this.channelTF[channelIdx].end_color;
        const tf_def = this.createTFArray(min, max, rgb1, rgb2, seaDragonViewer.numTFBins);
        tf_def.name = dataLayer.getShortChannelName(name);

        this.channelTF[channelIdx] = tf_def;
        this.forceRepaint();
    }

    /**
     * @function updateChannelColors
     *
     * @param name
     * @param color
     * @param type
     *
     * @returns void
     */
    updateChannelColors(name, color, type) {

        const channelIdx = imageChannels[name];

        const min = this.channelTF[channelIdx].min;
        const max = this.channelTF[channelIdx].max;
        let rgb1 = this.channelTF[channelIdx].start_color;
        let rgb2 = this.channelTF[channelIdx].end_color;
        if (type === "black") {
            rgb1 = color;
        } else {
            rgb2 = color;
        }
        const tf_def = this.createTFArray(min, max, rgb1, rgb2, seaDragonViewer.numTFBins);
        tf_def.name = dataLayer.getShortChannelName(name);

        this.channelTF[channelIdx] = tf_def;
        this.forceRepaint();
    }

    /**
     * @function updateData
     *
     * @param data
     *
     * @returns void
     */
    updateData(data) {

        this.data = data;
        this.forceRepaint();
    }

    /**
     * @function updateRenderingMode
     *
     * @param mode
     *
     * @returns void
     */
    updateRenderingMode(mode) {

        // Mode is a string: 'show-subset', 'show-selection'
        if (mode === 'show-subset') {
            this.show_subset = !this.show_subset;
        }
        if (mode === 'show-selection') {
            this.show_selection = !this.show_selection;
        }

        this.forceRepaint();

    }

    /**
     * @function updateSelection
     *
     * @param selection
     * @param repaint
     *
     * @returns void
     */
    updateSelection(selection, repaint = true) {
        this.neighborhoodButton.style.stroke = "#8f8f8f";
        this.selection = selection;

        if (repaint) this.forceRepaint();

    }
}

// Static vars
ImageViewer
    .events = {
    imageClickedMultiSel: 'image_clicked_multi_selection',
    renderingMode: 'renderingMode',
    displaySelection: 'displaySelection',
    displayNeighborhoodSelection: 'displayNeighborhoodSelection'
};

async function

addTile(path) {

    const promiseWrapper = new Promise((resolve, reject) => {
        function addTileResponse(success, error) {
            // console.log("Emergency Added Tile:", path);
            resolve();
        }

        const options = {
            src: path,
            loadWithAjax: true,
            crossOriginPolicy: false,
            ajaxWithCredentials: false,
            callback: addTileResponse
        }
        seaDragonViewer.viewer.imageLoader.addJob(options)
    })
    return Promise.all([promiseWrapper])

}
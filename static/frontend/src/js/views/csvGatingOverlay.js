import "regenerator-runtime/runtime.js";

/**
 * @class CsvGatingOverlay
 *
 */

export class CsvGatingOverlay {

    // Vars
    canvas = null;
    context = null;
    force = false;
    image_rect = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        degrees: 0
    };
    image_size = null;
    processing = false;
    viewer_rect = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        degrees: 0
    };
    range = [[], []];
    run_count = 0;

    // Configs
    configs = {
        radius: [0, 15],
        px_ratio: 2,
        stroke: 2
    }

    // Tools
    coord_scale_x = d3.scaleLinear();
    coord_scale_y = d3.scaleLinear();
    r_scale = d3.scalePow().exponent(0.5)
        .range(this.configs.radius);
    channel_scale = d3.scaleLinear()
        .range([-Math.PI / 2, Math.PI * 3 / 2]);

    /**
     * @constructor
     *
     * @param _viewer
     */
    constructor(_viewer, _imageViewer) {

        // Init vars
        this.viewer = _viewer;
        this.image_viewer = _imageViewer;
        this.global_channel_list = channelList;
        this.global_gating_list = csv_gatingList;
        this.global_data_layer = dataLayer;

        this.init();
    }

    /** 1.
     * @function init
     *
     * @return void
     */
    init() {

        // Get viewer container, append canvas
        const osdContainer = this.viewer.canvas.parentElement;
        this.canvas = d3.select(osdContainer).append('canvas')
            .attr('id', 'gating_overlay_canvas')
            .attr('width', osdContainer.clientWidth * this.configs.px_ratio)
            .attr('height', osdContainer.clientHeight * this.configs.px_ratio)
            .style('width', '100%')
            .style('height', '100%')
            .style('position', 'absolute')
            .style('pointer-events', 'none');
        this.context = this.canvas.node().getContext('2d');

        // Add event
        this.image_viewer.viewer.addHandler('animation-start', this.clear.bind(this));
        this.image_viewer.viewer.addHandler('animation-finish', this.evaluate.bind(this));

    }

    /** 2.
     * @function evaluate
     *
     * @event e
     *
     * @return void
     */
    evaluate(e = null) {

        // Get viewer bounds
        const viewer_rect = this.viewer.viewport.getBounds();

        // Cement viewer rect
        this.viewer_rect = viewer_rect;

        // Get image coordinates
        this.image_rect = this.viewer.world.getItemAt(0).viewportToImageRectangle(this.viewer_rect);
        this.range = [
            [this.image_rect.x, this.image_rect.y],
            [this.image_rect.x + this.image_rect.width, this.image_rect.y + this.image_rect.height]
        ];

        // If not processing
        if (!this.processing) {

            // Update processing status
            this.processing = true;

            // Draw
            this.draw();

            // Update processing status
            this.processing = false;

        }

    }

    /** 3.
     * @function draw
     *
     * @return void
     */
    draw() {

        // Context
        const ctx = this.context;
        const w = this.canvas.attr('width');
        const h = this.canvas.attr('height')

        // Update scales
        this.coord_scale_x.domain([this.range[0][0], this.range[1][0]])
            .range([0, w]);
        this.coord_scale_y.domain([this.range[0][1], this.range[1][1]])
            .range([0, h]);
        this.r_scale.domain([this.viewer.viewport.getMinZoom(), this.viewer.viewport.getMaxZoom()]);

        // Calc radius
        const r = this.r_scale(this.viewer.viewport.getZoom()).toFixed(2);


        // Get cells in range
        for (let k of this.image_viewer.selection.keys()) {

            // Get values
            const values = this.image_viewer.selection.get(k)

            // Position condition
            if (values.CellPosition_X >= this.range[0][0]
                && values.CellPosition_X <= this.range[1][0]
                && values.CellPosition_Y >= this.range[0][1]
                && values.CellPosition_Y <= this.range[1][1]
            ) {

                // Get coords
                const x = this.coord_scale_x(values.CellPosition_X);
                const y = this.coord_scale_y(values.CellPosition_Y);

                // Draw circles - placeholder
                ctx.strokeStyle = 'white';
                ctx.lineWidth = this.configs.stroke * this.configs.px_ratio;

                // Save context
                ctx.save();

                // Place in
                requestAnimationFrame(() => {

                    // Match to channel color
                    const gatingChannelIndices = [];
                    for (let key in this.global_gating_list.selections) {

                        this.global_channel_list.selections.forEach((c, i) => {

                            if (this.global_data_layer.getShortChannelName(key) === c) {

                                // Define current channel
                                const channel = this.global_gating_list.selections[key];

                                if (values[key] >= channel[0] && values[key] <= channel[1]) {
                                    gatingChannelIndices.push({
                                        key: key,
                                        value: values[key],
                                        index: i + 1
                                    });
                                }

                            }

                        });
                    }

                    // Update scale
                    this.channel_scale.domain([0, gatingChannelIndices.length]);

                    // this.global_gating_list.forEach(c => {
                    gatingChannelIndices.forEach((d, i) => {

                        // Retrieve color (FIXME - need to integrate into viewer manager)
                        // const rgb = evaluateTF(values[channel], this.image_viewer.channelTF[gatingChannelIndices[i]]);
                        // ctx.fillStyle = `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;
                        ctx.fillStyle = this.image_viewer.channelTF[gatingChannelIndices[i].index].end_color;

                        ctx.beginPath();
                        ctx.arc(x, y, r * this.configs.px_ratio, this.channel_scale(i), this.channel_scale(i + 1));
                        ctx.stroke();
                        ctx.fill();

                    });
                });

                ctx.restore();

            }

        }

    }

    /** 4.
     * @function clear
     *
     * @param {Event} e
     *
     * @return void
     */
    clear(e = null) {

        // Context
        const ctx = this.context;
        const w = this.canvas.attr('width');
        const h = this.canvas.attr('height')

        // Clear rect
        requestAnimationFrame(() => {
            ctx.clearRect(0, 0, w, h);
        });
    }


}

import * as d3 from 'd3';

/**
 * @class Viewfinder
 */
export default class Viewfinder {

    // Class refs
    lensing = null;

    // Data
    data = null;
    setup = null;
    on = false;

    // Elements
    els = {
        svg: null,
        g: null,
        dataPointG: null,
        radialG: null,
        boxG: null,
        blackboardRect: null,
    };

    /*
    Constructor
     */
    constructor(_lensing) {
        // Fields
        this.lensing = _lensing;

        // Set class vars
        this.set_class_vars();

        // Init
        this.init();
    }

    /**
     * 1.
     * @function init
     *
     */
    init() {
        // Define this
        const vis = this;

        // Build svg, g
        vis.els.svg = d3.select(vis.lensing.overlay.container)
            .append('svg');
        vis.els.g = vis.els.svg.append('g')
            .attr('class', 'viewfinder_g')
            .style('transform', `translate(${vis.configs.gMargin.top}px, ${vis.configs.gMargin.left}px)`);

        // Attach component g's
        vis.els.radialG = vis.els.g.append('g')
            .attr('class', 'viewfinder_radial_g');
        vis.els.dataPointG = vis.els.radialG.append('g')
            .attr('class', 'viewfinder_data_point_g')
            .style('visibility', 'hidden');
        vis.els.dataPointG.append('path')
            .attr('fill', 'none')
            .attr('stroke', 'rgba(255, 255, 255, 1)')
            .style('transform', 'translate3d(0, 0, 0)');
        vis.els.boxG = vis.els.dataPointG.append('g')
            .attr('class', 'viewfinder_box_g')
            .style('transform', 'translate3d(0, 0, 0)');
        vis.els.blackboardRect = vis.els.boxG.append('rect')
            .attr('class', 'viewfinder_box_blackboard')
            .attr('width', vis.configs.boxW)
            .attr('height', vis.configs.boxH)
            .attr('fill', 'rgba(0, 0, 0, 0.75)');

    }

    /**
     * 2.
     * @function wrangle
     *
     */
    wrangle() {
        // Define this
        const vis = this;

        if (vis.on) {

            // Update data
            vis.data = this.lensing.configs.pxData;

            // Update configs - purpose:placement
            vis.configs.r = vis.lensing.configs.rad / vis.lensing.configs.pxRatio;
            vis.configs.rPointer = vis.configs.r + vis.configs.rPointerExt;
            vis.configs.w = vis.configs.h = (vis.configs.r + vis.configs.extend) * 2;
            vis.configs.gW = vis.configs.w - (vis.configs.gMargin.right + vis.configs.gMargin.left);
            vis.configs.gH = vis.configs.h - (vis.configs.gMargin.top + vis.configs.gMargin.bottom);

            // Check coordinate position - purpose:placement
            const x = this.lensing.configs.pos[0] / vis.lensing.configs.pxRatio - this.lensing.viewer.canvas.clientWidth / 2;
            const y = this.lensing.configs.pos[1] / vis.lensing.configs.pxRatio - this.lensing.viewer.canvas.clientHeight / 2;
            vis.deg = Math.atan2(y, x) * (180 / Math.PI);

            // Update tools - purpose:placement
            vis.tools.xScale
                .domain([-vis.configs.rPointer, vis.configs.rPointer])
                .range([-vis.configs.boxW, 0]);
            vis.tools.yScale
                .domain([-vis.configs.rPointer, vis.configs.rPointer])
                .range([-vis.configs.boxH, 0]);

            // Setup specific
            if (!vis.lensing.lenses.selections.filter.settings.async) {
                vis.setup.wrangle();
            }
        }

        // Render
        vis.render();
    }

    /**
     * 3.
     * @function render
     *
     */
    render() {
        // Define this
        const vis = this;

        if (vis.on) {
            // Update svg, g
            vis.els.svg.attr('width', vis.configs.w)
                .attr('height', vis.configs.h)
                .attr('style', `position: absolute; left: ${-vis.configs.extend}px; top: ${-vis.configs.extend}px;`)

            // Update radialG
            vis.els.radialG.style('transform', `translate(${vis.configs.gW / 2}px, ${vis.configs.gH / 2}px)`)

            // Update dataPointG
            vis.els.dataPointG
                .datum(vis.data)
                .each(function (d) {
                    const g = d3.select(this);

                    // Pointer coords
                    const pCoords = getCoords(vis.configs.rPointer, vis.deg - 90);
                    const addX = Math.round(vis.tools.xScale(pCoords[0]));
                    const addY = Math.round(vis.tools.yScale(pCoords[1]));

                    // Update path
                    g.select('path')
                        .attr('d', vis.tools.lineMaker([[0, 0], pCoords]));

                    // Update dataPointG, boxG visibility, pos
                    vis.els.dataPointG.style('visibility', 'visible');
                    vis.els.boxG.style('transform', `translate(${pCoords[0] + addX}px, ${pCoords[1] + addY}px)`);
                });

            /* getCoords */
            function getCoords(r, i) {
                const x = Math.round(r * Math.sin(vis.tools.coordScale(i)));
                const y = Math.round(r * Math.cos(vis.tools.coordScale(i)));
                return [x, y];
            }

            // Setup specific
            if (!vis.lensing.lenses.selections.filter.settings.async) {
                vis.setup.render();
            }

        } else {

            // Hide
            vis.els.dataPointG.style('visibility', 'hidden');
        }

    }

    /**
     * 4.
     * @function refresh
     *
     */
    refresh() {
        // Define this
        const vis = this;

        // Remove all from boxG
        vis.setup.destroy();

        // Reset class vars
        vis.set_class_vars();

        // Restyle
        vis.restyle();

    }

    /**
     * @function check_for_setup()
     *
     * @param {Object} ref
     */
    check_for_setup(ref) {
        if (ref.config.vf_ref && ref.config.vf_ref === 'vis_data_custom') {
            this.setups.push(ref.config.get_vf_setup());
        }
    }

    /**
     * @function restyle()
     *\
     */
    restyle() {
        // TODO - expand to include all styling operations
        this.els.blackboardRect.attr('width', this.configs.boxW);
        this.els.blackboardRect.attr('height', this.configs.boxH);
    }

    /**
     * @function set_class_vars()
     *
     */
    set_class_vars() {

        // Configs
        this.configs = {
            boxW: 150,
            boxH: 90,
            deg: 0,
            extend: 400,
            gMargin: {top: 0, left: 0, right: 0, bottom: 0},
            gH: 0,
            gW: 0,
            h: 0,
            r: 0,
            rPointer: 0,
            rPointerExt: 50,
            w: 0,
        };

        // Tools - TODO add boxScale to trace perimeter
        this.tools = {
            coordScale: d3.scaleLinear()
                .domain([0, 360])
                .range([Math.PI, -Math.PI]),
            lineMaker: d3.line(),
            xScale: d3.scaleLinear(),
            yScale: d3.scaleLinear(),
        }
    }

    /*
    setups
    - Really just an example of D3 plugin chart
     */
    setups = [
        {
            name: 'vis_data_rgb',
            init: () => {
                // Define this
                const vis = this;

                // Setup vars
                vis.range_nest = [];

                // Setup els
                vis.els.areachartG = null;
                vis.els.areachartAxisG = null
                vis.els.textReportG = null;

                // Setup configs
                vis.configs.areachartW = 120;
                vis.configs.areachartH = 20;
                vis.configs.row_spacing = 16;

                // Setup tools
                vis.tools.nestScX = d3.scaleLinear().range([0, this.configs.areachartW])
                vis.tools.nestScY = d3.scaleLinear().range([this.configs.areachartH, 0])
                vis.tools.area = d3.area()
                    .x(d => this.tools.nestScX(+d.key))
                    .y1(d => this.tools.nestScY(d.value))
                    .y0(this.configs.areachartH);

                // Add text
                vis.els.textReportG = vis.els.boxG.append('g')
                    .attr('class', 'viewfinder_text_report_g');
                vis.els.textReportG.append('text')
                    .attr('class', 'viewfinder_box_text viewfinder_box_text_a')
                    .attr('fill', 'white')
                    .attr('x', `${vis.configs.boxW / 2}px`)
                    .attr('y', `${vis.configs.row_spacing}px`)
                    .attr('text-anchor', 'middle')
                    .attr('alignment-baseline', 'middle')
                    .style('font-family', 'sans-serif')
                    .style('font-size', '10px')
                    .style('font-weight', 'lighter');
                vis.els.textReportG.append('text')
                    .attr('class', 'viewfinder_box_text viewfinder_box_text_b')
                    .attr('fill', 'white')
                    .attr('x', `${vis.configs.boxW / 2}px`)
                    .attr('y', `${vis.configs.row_spacing * 2}px`)
                    .attr('text-anchor', 'middle')
                    .attr('alignment-baseline', 'middle')
                    .style('font-family', 'sans-serif')
                    .style('font-size', '9px')
                    .style('font-style', 'italic')
                    .style('font-weight', 'lighter');

                // Add area chart (histogram)
                vis.els.areachartG = vis.els.boxG.append('g')
                    .attr('class', 'viewfinder_areachart_g')
                    .style('transform',
                        `translate(${(vis.configs.boxW - vis.configs.areachartW) / 2}px, ${vis.configs.row_spacing * 3}px)`);
                vis.els.areachartG.append('path')
                    .attr('class', 'viewfinder_areachart_path');
                vis.els.areachartAxisG = vis.els.areachartG.append('g')
                    .attr('class', 'viewfinder_areachart_axis_g')
                    .style('transform', `translateY(${vis.configs.areachartH + 2}px)`);
                vis.els.areachartAxisG.append('line')
                    .attr('class', 'viewfinder_areachart_axis_line viewfinder_areachart__axis_line_left')
                    .attr('x1', 0)
                    .attr('x2', 0)
                    .attr('y1', 0)
                    .attr('y2', 4)
                    .attr('stroke', 'white')
                    .attr('stroke-width', 0.5);
                vis.els.areachartAxisG.append('line')
                    .attr('class', 'viewfinder_areachart_axis_line viewfinder_areachart_axis_line_right')
                    .attr('x1', vis.configs.areachartW)
                    .attr('x2', vis.configs.areachartW)
                    .attr('y1', 0)
                    .attr('y2', 3)
                    .attr('stroke', 'white')
                    .attr('stroke-width', 0.5);
                vis.els.areachartAxisG.append('line')
                    .attr('class', 'viewfinder_areachart_axis_line viewfinder_areachart_axis_line_sel')
                    .attr('y1', 0)
                    .attr('y2', 3)
                    .attr('stroke', 'white')
                    .attr('stroke-width', 0.5);
                vis.els.areachartAxisG.append('text')
                    .attr('class', 'viewfinder_areachart_axis_text viewfinder_areachart_axis_text_left')
                    .attr('x', 0)
                    .attr('y', 12)
                    .attr('fill', 'white')
                    .attr('font-family', 'sans-serif;')
                    .attr('font-size', 8)
                    .attr('font-weight', 'lighter')
                    .attr('text-anchor', `end`);
                vis.els.areachartAxisG.append('text')
                    .attr('class', 'viewfinder_areachart_axis_text viewfinder_areachart_axis_text_sel')
                    .attr('y', 12)
                    .attr('fill', 'white')
                    .attr('font-family', 'sans-serif;')
                    .attr('font-size', 8)
                    .attr('font-weight', 'lighter')
                    .attr('text-anchor', `middle`);
                vis.els.areachartAxisG.append('text')
                    .attr('class', 'viewfinder_areachart_axis_text viewfinder_areachart_axis_text_right')
                    .attr('x', vis.configs.areachartW)
                    .attr('y', 12)
                    .attr('fill', 'white')
                    .attr('font-family', 'sans-serif;')
                    .attr('font-size', 8)
                    .attr('font-weight', 'lighter')
                    .attr('text-anchor', `start`);
            },
            wrangle: () => {
                // Define this
                const vis = this;

                // Nest - purpose:range
                vis.nest_range =
                    Array.from(d3.group(vis.data.range, d => d), ([key, value]) => ({key, value: value.length}));
                vis.nest_range.sort((a, b) => {
                    return +a.key - +b.key;
                });

                // Config - purpose:range
                vis.tools.nestScX.domain([0, +vis.nest_range[vis.nest_range.length - 1].key]);
                vis.tools.nestScY.domain([0, d3.max(vis.nest_range, d => +d.value)]);


            },
            render: () => {
                // Define this
                const vis = this;

                // Update text
                vis.els.boxG.select('.viewfinder_box_text_a')
                    .text(`Color Index #${this.data.sel.index}`);
                vis.els.boxG.select('.viewfinder_box_text_b')
                    .text(`rgb(${this.data.sel.r}, ${this.data.sel.g}, ${this.data.sel.b})`);

                // Build area chart
                vis.els.areachartG.select('.viewfinder_areachart_path')
                    .datum(vis.nest_range)
                    .attr('d', vis.tools.area)
                    .attr('fill', 'white');

                // Update area chart axis
                const selRange = Math.round(vis.data.sel_range)
                const selX = Math.round(vis.tools.nestScX(selRange));
                const x = vis.tools.nestScX.domain();
                vis.els.areachartAxisG.select('.viewfinder_areachart_axis_line_sel')
                    .attr('x1', selX)
                    .attr('x2', selX);
                vis.els.areachartAxisG.select('.viewfinder_areachart_axis_text_left')
                    .text(x[0]);
                vis.els.areachartAxisG.select('.viewfinder_areachart_axis_text_sel')
                    .attr('x', selX)
                    .attr('text-anchor', () => {
                        if (selRange > x[1] * 0.75) {
                            return 'end';
                        } else if (selRange < x[1] * 0.25) {
                            return 'start';
                        }
                        return 'middle';
                    })
                    .text(selRange);
                vis.els.areachartAxisG.select('.viewfinder_areachart_axis_text_right')
                    .text(x[1]);
            },
            destroy: () => {
                // Define this
                const vis = this;

                // Remove els
                vis.els.textReportG.remove();
                vis.els.areachartG.remove();
                vis.els.areachartAxisG.remove();
            }
        }
    ]


}
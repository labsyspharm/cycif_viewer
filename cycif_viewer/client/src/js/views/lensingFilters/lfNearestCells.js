/**
 * @class LfNearestCells
 */
export class LfNearestCells {

    // Class vars (and chart 'vars')
    data = [];
    load = [];
    vars = {
        cellIntensityRange: [0, 65536],
        config_colorR: 4,
        config_boxW: 240,
        config_boxH: 50,
        config_boxMargin: {top: 7, right: 6, bottom: 7, left: 6},
        config_channelExtH: 50,
        config_chartsMargin: {top: 10, right: 30, bottom: 10, left: 30},
        config_rectPad: 0.15,
        el_boxExtG: null,
        el_cellsG: null,
        el_chartsG: null,
        el_radialExtG: null,
        el_textReportG: null,
        histRange: [],
        tool_rCellScale: d3.scalePow()
            .exponent(0.5)
            .range([0.5, 10]),
        tool_scX: d3.scaleLinear(),
        tool_scY: d3.scaleLinear(),
    };

    /**
     * @constructor
     */
    constructor(_imageViewer) {
        this.image_viewer = _imageViewer;

        // From global vars
        this.data_layer = dataLayer;
        this.channel_list = channelList;

        // Init
        this.init()
    }


    /**
     * @function init
     *
     * @return void
     */
    init() {

        this.data = [];
        this.load = {
            data: [],
            config: {
                type: 'object-single',
                filter: 'fil_data_custom',
                vf_ref: 'vis_data_custom',
                filterCode: {
                    data: [],
                    name: 'fil_data_nearest_cells',
                    vis_name: 'Data Nearest Cells',
                    settings: {
                        active: 1,
                        async: true,
                        default: 1,
                        loading: false,
                        max: 1,
                        min: 0,
                        step: 1,
                        vf: true,
                        vf_setup: 'vis_data_nearest_cells',
                        iter: 'px'
                    },
                    set_pixel: () => {

                        if (!this.load.config.filterCode.settings.loading) {

                            // Lensing ref
                            const lensing = this.image_viewer.viewer.lensing;

                            // Measure relative
                            const screenPt1 = new OpenSeadragon.Point(0, 0);
                            const screenPt2 =
                                new OpenSeadragon.Point(lensing.configs.rad / lensing.configs.pxRatio, 0);
                            const contextPt1 =
                                this.image_viewer.viewer.world.getItemAt(0).viewerElementToImageCoordinates(screenPt1);
                            const contextPt2 =
                                this.image_viewer.viewer.world.getItemAt(0).viewerElementToImageCoordinates(screenPt2)
                            let newRad = Math.round(contextPt2.x - contextPt1.x)
                            if (newRad > 500) newRad = 500;

                            // Get position of cell and add to data
                            const pos = lensing.configs.pos_full;

                            // Load
                            this.load.config.filterCode.settings.loading = true;
                            this.data_layer.getIndividualNeighborhood(newRad, pos[0], pos[1]).then(darr => {

                                // Loaded
                                this.load.config.filterCode.settings.loading = false;

                                // Send another request if mouse pos is diff
                                if (pos[0] !== lensing.configs.pos_full[0] && pos[1] !== lensing.configs.pos_full[1]) {
                                    this.load.config.filterCode.set_pixel();
                                }

                                // Check if same filter (in case async return arrives after change)
                                if (this.load.config.filterCode.name !==
                                    this.image_viewer.viewer.lensing.lenses.selections.filter.name) {
                                    (this.load.config.get_vf_setup()).destroy();
                                    return;
                                }

                                // Clear data to vis
                                this.data = [];

                                // Iterate data array
                                darr.forEach(d => {
                                    // Calc offset
                                    const cell_point = new OpenSeadragon.Point(d.CellPosition_X, d.CellPosition_Y);
                                    const cell_vpoint = lensing.viewer_aux.viewport.pixelFromPoint(
                                        lensing.viewer_aux.world.getItemAt(0).imageToViewportCoordinates(cell_point)
                                    );
                                    const offset = [
                                        Math.round(cell_vpoint.x - lensing.configs.pos[0] / lensing.configs.pxRatio),
                                        Math.round(cell_vpoint.y - lensing.configs.pos[1] / lensing.configs.pxRatio)
                                    ];
                                    const distance = Math.sqrt(offset[0] ** 2 + offset[1] ** 2);

                                    // Add to vis data
                                    if (distance <= lensing.configs.rad / lensing.configs.pxRatio) {
                                        this.data.push({
                                            data: d,
                                            offset: offset
                                        });
                                    }
                                });

                                // Trigger update
                                lensing.viewfinder.setup.wrangle()
                                lensing.viewfinder.setup.render();

                            }).catch(err => console.log(err));

                        }

                    },
                    update: (i, index) => {

                        // Magnify (simply pass through after filter)
                        this.image_viewer.viewer.lensing.lenses.selections.magnifier.update(i, index);
                    },
                    fill: 'rgba(255, 255, 255, 0)',
                    stroke: 'rgba(0, 0, 0, 1)'
                },
                get_vf_setup: () => {
                    return {
                        name: 'vis_data_nearest_cells',
                        init: () => {

                            // Define this
                            const vf = this.image_viewer.viewer.lensing.viewfinder;

                            // Update viewfinder
                            vf.els.blackboardRect.attr('width', this.vars.config_boxW);
                            vf.configs.boxW = this.vars.config_boxW;

                            // Configurations
                            this.vars.tool_scX.range([0, this.vars.config_boxW - (this.vars.config_chartsMargin.right
                                + this.vars.config_chartsMargin.left)])
                                .domain(this.vars.cellIntensityRange);
                            this.vars.tool_scY.range([0.5, this.vars.config_channelExtH -
                            (this.vars.config_chartsMargin.top + this.vars.config_chartsMargin.bottom)]);
                            this.vars.tool_rCellScale.domain([this.image_viewer.viewer.viewport.getMinZoom(),
                                this.image_viewer.viewer.viewport.getMaxZoom()]);

                            // Add extensions (to later remove)
                            this.vars.el_radialExtG = vf.els.radialG.append('g')
                                .attr('class', 'viewfinder_radial_ext_g');
                            this.vars.el_boxExtG = vf.els.boxG.append('g')
                                .attr('class', 'viewfinder_box_ext_g');

                            // Append cellsG
                            this.vars.el_cellsG = this.vars.el_radialExtG.append('g')
                                .attr('class', 'viewfinder_cells_g');

                            // Append textReportG
                            this.vars.el_textReportG = this.vars.el_boxExtG.append('g')
                                .attr('class', 'viewfinder_text_report_g');
                            this.vars.el_textReportG.append('text')
                                .attr('class', 'viewfinder_text_report_text1')
                                .attr('x', this.vars.config_boxMargin.left)
                                .attr('y', this.vars.config_boxMargin.top)
                                .attr('text-anchor', 'start')
                                .attr('dominant-baseline', 'hanging')
                                .attr('fill', 'white')
                                .attr('font-family', 'sans-serif')
                                .attr('font-size', 10.5)
                                .attr('font-weight', 'lighter')
                                .text('Multi cell analysis (intensity)');
                            this.vars.el_textReportG.append('text')
                                .attr('class', 'viewfinder_text_report_text2')
                                .attr('x', this.vars.config_boxMargin.left * 2.5)
                                .attr('y', this.vars.config_boxMargin.top * 3.5)
                                .attr('text-anchor', 'start')
                                .attr('dominant-baseline', 'hanging')
                                .attr('fill', 'white')
                                .attr('font-family', 'sans-serif')
                                .attr('font-size', 9)
                                .attr('font-style', 'italic')
                                .attr('font-weight', 'lighter');

                            // Append chartG
                            this.vars.el_chartsG = this.vars.el_boxExtG.append('g')
                                .attr('class', 'viewfinder_charts_g')
                                .style('transform', `translate(${this.vars.config_chartsMargin.left}px, 
                                    ${this.vars.config_chartsMargin.top}px)`);

                        },
                        wrangle: () => {

                            // Get channels
                            const channels = this.channel_list.selections;

                            // TODO - nucleus ave
                            let aveNucleus = 0;

                            // Get range hist
                            this.vars.histRange = [];
                            if (this.data.length > 0) {
                                for (let k in this.data[0].data) {

                                    // Add channels
                                    if (this.data[0].data.hasOwnProperty(k) &&
                                        channels.includes(k.split('_')[0])) {
                                        const map = this.data.map(c => c.data[k]);
                                        const sum = map.reduce((acc, cur) => acc + cur);
                                        this.vars.histRange.push({
                                            key: k,
                                            mean: sum / map.length,
                                            short_name: k.split('_')[0],
                                            values: map
                                        });
                                    }

                                    // Update nucleus
                                    const nucArray = this.data.map(c => c.data.NucleusArea)
                                    const nucTotal = nucArray.reduce((acc, cur) => acc + cur);
                                    aveNucleus = nucTotal / nucArray.length;

                                }

                                // Histogram
                                this.vars.histRange.forEach(d => {
                                    d.bins = d3.bin()
                                        .domain(this.vars.tool_scX.domain())
                                        .thresholds(this.vars.tool_scX.ticks(25))
                                        (d.values);
                                })

                                // Config
                                let max = 0;
                                this.vars.histRange.forEach(d => {
                                    d.bins.forEach(b => {
                                        if (b.length > max) max = b.length;
                                    });
                                });
                                this.vars.tool_scY.domain([0, max]);

                            }

                        },
                        render: () => {

                            // Define this
                            const vis = this;
                            const vf = this.image_viewer.viewer.lensing.viewfinder;

                            // Define cell, channels
                            const channels = this.channel_list.selections;

                            // Update vf box size
                            vf.els.blackboardRect.attr('height', this.vars.config_boxH
                                + channels.length * this.vars.config_channelExtH);
                            vf.configs.boxH = this.vars.config_boxH + channels.length * this.vars.config_channelExtH;

                            // Get zoom
                            const zoom = vis.image_viewer.viewer.viewport.getZoom();
                            const cellR = vis.vars.tool_rCellScale(zoom);

                            // Append cell center circles
                            this.vars.el_cellsG.selectAll('.cell')
                                .data(this.data)
                                .join(
                                    enter => enter.append('g')
                                        .attr('class', 'cell')
                                        .each(function (d) {
                                            const g = d3.select(this)
                                                .style(`transform`, `translate(${d.offset[0]}px, ${d.offset[1]}px)`);
                                            g.append('circle')
                                                .attr('r', cellR)
                                                .attr('fill', 'none')
                                                .attr('stroke', 'rgba(0, 0, 0, 0.5)')
                                                .attr('stroke-width', 2);
                                            g.append('circle')
                                                .attr('r', cellR)
                                                .attr('fill', 'none')
                                                .attr('stroke', 'white')
                                                .attr('stroke-width', 1);
                                        }),
                                    update => update
                                        .each(function (d) {
                                            const g = d3.select(this)
                                                .style(`transform`, `translate(${d.offset[0]}px, ${d.offset[1]}px)`);
                                            g.selectAll('circle')
                                                .attr('r', cellR)
                                        }),
                                    exit => exit.remove()
                                );


                            /*
                            aux function :: getChannelColor
                             */
                            function getChannelColor(name, value) {

                                if (channels.includes(name)) {
                                    // Find channel TF
                                    let channelTF = null;
                                    for (let k in vis.image_viewer.channelTF) {
                                        if (vis.image_viewer.channelTF.hasOwnProperty(k) &&
                                            vis.image_viewer.channelTF[k].name === name) {
                                            channelTF = vis.image_viewer.channelTF[k];
                                            break;
                                        }
                                    }
                                    if (channelTF) {

                                        // Retrieve color
                                        const rgb = vis.image_viewer.viewerManagerVMain.evaluateTF(
                                            value, channelTF);
                                        return `rgb(${Math.round(rgb.r)}, 
                                                        ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;
                                    }

                                }
                                return 'none';
                            }

                            /*
                            aux func :: nestedJoin()
                             */
                            function nestedJoin(chart, b) {

                                // Config
                                const w = vis.vars.tool_scX(b.bins[0].x1);
                                const pad = w * vis.vars.config_rectPad;

                                // Build bars
                                chart.selectAll('.viewfinder_charts_g_chart_g_bin_g')
                                    .data(b.bins)
                                    .join('rect')
                                    .transition()
                                    .attr('class', 'viewfinder_charts_g_chart_g_bin_g')
                                    .attr('x', (d, i) => w * i + pad)
                                    .attr('y', d => {
                                        return (vis.vars.tool_scY.range()[1] - vis.vars.tool_scY(d.length)) / 2;
                                    })
                                    .attr('width', w - pad * 2)
                                    .attr('height', d => vis.vars.tool_scY(d.length))
                                    .attr('fill', d => {
                                        if (d.length > 0) return 'rgba(255, 255, 255, 1)';
                                        return 'rgba(255, 255, 255, 0.5)';
                                    });
                            }

                            // Append chart for each channel
                            this.vars.el_chartsG.selectAll('.viewfinder_charts_g_chart_g')
                                .data(channels)
                                .join(
                                    enter => enter
                                        .append('g')
                                        .attr('class', 'viewfinder_charts_g_chart_g')
                                        .each(function (d, i) {
                                            const g = d3.select(this)
                                                .style('transform', `translateY(${i * vis.vars.config_channelExtH +
                                                vis.vars.config_boxH}px)`);

                                            // Find histogram
                                            const bins = vis.vars.histRange.find(h => d === h.short_name);
                                            if (bins) {

                                                // Label g
                                                const labelG = g.append('g')
                                                    .attr('class', 'viewfinder_charts_g_chart_g_label_g')
                                                    .style('transform',
                                                        `translate(${-vis.vars.config_chartsMargin.left / 2}px, 
                                                        ${-vis.vars.config_chartsMargin.top / 2}px)`);

                                                // Append label
                                                labelG.append('circle')
                                                    .attr('class', 'viewfinder_charts_g_chart_g_circle')
                                                    .attr('r', vis.vars.config_colorR)
                                                    .attr('cy', -vis.vars.config_colorR)
                                                    .attr('fill', getChannelColor(d, bins.mean))
                                                    .attr('stroke', () => {
                                                        if (channels.includes(d)) return 'rgba(255, 255, 255, 1)';
                                                        return 'rgba(255, 255, 255, 0)';
                                                    })
                                                    .attr('stroke-width', 0.5);
                                                labelG.append('text')
                                                    .attr('class', 'viewfinder_charts_g_chart_g_text')
                                                    .attr('x', vis.vars.config_colorR * 2)
                                                    .attr('fill', 'rgba(255, 255, 255, 0.95)')
                                                    .attr('font-family', 'sans-serif')
                                                    .attr('font-size', 9)
                                                    .attr('text-anchor', 'start')
                                                    .text(d);

                                                // Join bins
                                                nestedJoin(g, bins);
                                            }

                                        }),
                                    update => update
                                        .each(function (d, i) {
                                            const g = d3.select(this)
                                                .style('transform', `translateY(${i * vis.vars.config_channelExtH +
                                                vis.vars.config_boxH}px)`);

                                            // Find histogram
                                            const bins = vis.vars.histRange.find(h => d === h.short_name);
                                            if (bins) {

                                                // Label g
                                                const labelG = g.select('.viewfinder_charts_g_chart_g_label_g');

                                                // update channel color
                                                labelG.select('.viewfinder_charts_g_chart_g_circle')
                                                    .attr('fill', getChannelColor(d, bins.mean))
                                                    .attr('stroke', () => {
                                                        if (channels.includes(d)) return 'rgba(255, 255, 255, 1)';
                                                        return 'rgba(255, 255, 255, 0)';
                                                    });

                                                // Join bins
                                                nestedJoin(g, bins);
                                            }

                                        }),
                                    exit => exit.remove()
                                );

                            // Update cell count
                            this.vars.el_textReportG.select('.viewfinder_text_report_text2')
                                .text(() => {
                                    if (this.data.length > 0) return `Cell count: ${this.data.length}`;
                                    return '';
                                })

                        },
                        destroy: () => {

                            // Remove
                            this.vars.el_radialExtG.remove();
                            this.vars.el_boxExtG.remove();

                        }
                    }
                },
            }
        }

    }
}
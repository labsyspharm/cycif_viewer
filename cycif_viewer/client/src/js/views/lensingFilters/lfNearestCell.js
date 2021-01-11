/**
 * @class LfNearestCell
 */
export class LfNearestCell {

    // Class vars (and chart 'vars')
    data = [];
    load = [];
    vars = {
        cellChannels: [],
        cellIntensityRange: [0, 65536],
        config_boxMargin: {top: 7, right: 6, bottom: 7, left: 6},
        config_boxW: 240,
        config_boxH: 240,
        config_channelR: 3,
        config_chartR0: 15,
        config_chartR1: 65,
        config_nucleusMargin: {top: 0, right: 0, bottom: 20, left: 20},
        config_nucleusR: 15,
        el_boxExtG: null,
        el_cellsG: null,
        el_chartG: null,
        el_chartAreaPath: null,
        el_chartLabelsG: null,
        el_idG: null,
        el_nucleusG: null,
        el_radialExtG: null,
        el_textReportG: null,
        tool_angleScale: d3.scaleLinear()
            .range([0, 2 * Math.PI]),
        tool_areaMaker: d3.areaRadial()
            .curve(d3.curveCardinalClosed),
        tool_channelScale: d3.scaleLinear()
            .range([Math.PI, -Math.PI]),
        tool_nucleusScale: d3.scaleSqrt()
            .domain([0, 200]),
        tool_radiusScale: d3.scaleLinear()
            .domain([0, 1]),
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
                    name: 'fil_data_nearest_cell',
                    vis_name: 'Data Nearest Cell',
                    settings: {
                        active: 1,
                        async: true,
                        default: 1,
                        loading: false,
                        max: 1,
                        min: 0,
                        step: 1,
                        vf: true,
                        vf_setup: 'vis_data_nearest_cell',
                        iter: 'px'
                    },
                    set_pixel: () => {

                        if (!this.load.config.filterCode.settings.loading) {

                            // Lensing ref
                            const lensing = this.image_viewer.viewer.lensing;

                            // Get position of cell and add to data
                            const pos = lensing.configs.pos_full;

                            // Load
                            this.load.config.filterCode.settings.loading = true;
                            this.data_layer.getNearestCell(pos[0], pos[1]).then(d => {

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
                        name: 'vis_data_nearest_cell',
                        init: () => {

                            // Define this
                            const vf = this.image_viewer.viewer.lensing.viewfinder;

                            // Update vf box size
                            vf.els.blackboardRect.attr('height', this.vars.config_boxH);
                            vf.els.blackboardRect.attr('width', this.vars.config_boxW);
                            vf.configs.boxH = this.vars.config_boxH;
                            vf.configs.boxW = this.vars.config_boxW;

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
                                .text('Single cell analysis (intensity)')

                            // Append chartG
                            this.vars.el_chartG = this.vars.el_boxExtG.append('g')
                                .attr('class', 'viewfinder_chart_g')
                                .style('transform', `translate(${this.vars.config_boxW / 2}px, 
                                    ${this.vars.config_boxW / 2 + this.vars.config_boxMargin.top}px)`);
                            this.vars.el_chartLabelsG = this.vars.el_chartG.append('g')
                                .attr('class', 'viewfinder_chart_label_g');
                            this.vars.el_chartAreaPath = this.vars.el_chartG.append('path')
                                .attr('class', 'viewfinder_chart_area_path')
                                .attr('fill', 'rgba(255, 255, 255, 0.9');

                            // Append nucleusG
                            this.vars.el_nucleusG = this.vars.el_boxExtG.append('g')
                                .attr('class', 'viewfinder_nucleus_g')
                                .style('transform', `translate(${this.vars.config_nucleusMargin.left}px, 
                                    ${this.vars.config_boxH - this.vars.config_nucleusMargin.bottom}px)`);
                            this.vars.el_nucleusG.append('circle')
                                .attr('class', 'viewfinder_nucleus_g_circle')
                                .attr('fill', 'rgba(255, 255, 255, 0.9)');
                            this.vars.el_nucleusG.append('text')
                                .attr('class', 'viewfinder_chart_nucleus_g_text1')
                                .attr('y', 1)
                                .attr('fill', 'rgba(0, 0, 0, 0.95)')
                                .attr('font-family', 'sans-serif')
                                .attr('font-size', 10.5)
                                .attr('text-anchor', 'middle')
                                .attr('dominant-baseline', 'middle');
                            this.vars.el_nucleusG.append('text')
                                .attr('class', 'viewfinder_nucleus_g_text2')
                                .attr('x', this.vars.config_nucleusR)
                                .attr('y', this.vars.config_nucleusR)
                                .attr('fill', 'rgba(255, 255, 255, 0.95)')
                                .attr('font-family', 'sans-serif')
                                .attr('font-size', 9)
                                .attr('font-style', 'italic')
                                .attr('text-anchor', 'start')
                                .text('Nuc. Area');

                            // Append idG
                            this.vars.el_idG = this.vars.el_boxExtG.append('g')
                                .attr('class', 'viewfinder_id_g')
                                .style('transform',
                                    `translate(${this.vars.config_boxW - this.vars.config_boxMargin.left}px, 
                                    ${this.vars.config_boxMargin.bottom}px)`);
                            this.vars.el_idG.append('text')
                                .attr('class', 'tool_cell_sel_id_text')
                                .attr('fill', 'rgba(255, 255, 255, 1)')
                                .attr('font-family', 'sans-serif')
                                .attr('font-size', 9)
                                .attr('font-weight', 'bold')
                                .attr('text-anchor', 'start')
                                .attr('dominant-baseline', 'hanging')
                                .style('writing-mode', 'vertical-rl')
                                .style('text-orientation', 'upright')
                                .style('letter-spacing', '-1px');

                        },
                        wrangle: () => {

                            // Define cell
                            let cell = {};
                            if (this.data && this.data[0] && this.data[0].data) {
                                cell = this.data[0].data;
                            }

                            // Set blacklist (non-channels)
                            const blacklist = ['CellPosition_X', 'CellPosition_Y', 'NucleusArea', 'id', 'phenotype'];

                            // Clear then update cell channels
                            this.vars.cellChannels = [];
                            for (let k in cell) {
                                if (cell.hasOwnProperty(k) && !blacklist.includes(k)) {
                                    this.vars.cellChannels.push({
                                        key: k,
                                        short: k.split('_')[0],
                                        value: cell[k]
                                    });
                                }
                            }
                            this.vars.cellChannels.sort((a, b) => {
                                if (a.key.toLowerCase() < b.key.toLowerCase()) return -1;
                                if (a.key.toLowerCase() > b.key.toLowerCase()) return 1;
                                return 0;
                            });
                            this.vars.cellChannels.forEach((d, i) => {
                                // Add index
                                d.index = i;
                            })

                            // Config
                            this.vars.tool_angleScale.domain([0, this.vars.cellChannels.length]);
                            this.vars.tool_channelScale.domain([0, this.vars.cellChannels.length]);
                            this.vars.tool_nucleusScale.range([7, this.vars.config_nucleusR])
                            this.vars.tool_radiusScale
                                .range([this.vars.config_chartR0, this.vars.config_chartR1])
                            this.vars.tool_areaMaker
                                .innerRadius(() => this.vars.tool_radiusScale(this.vars.cellIntensityRange[0]))
                                .outerRadius(d => this.vars.tool_radiusScale(d.value / this.vars.cellIntensityRange[1]))
                                .angle(d => this.vars.tool_angleScale(d.index));

                        },
                        render: () => {

                            // Define this
                            const vis = this;

                            // Define cell, channels
                            let cell = {};
                            if (this.data && this.data[0] && this.data[0].data) {
                                cell = this.data[0].data;
                            }
                            const channels = this.channel_list.selections;

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
                                                .attr('r', 3)
                                                .attr('fill', 'none')
                                                .attr('stroke', 'rgba(0, 0, 0, 0.5)')
                                                .attr('stroke-width', 2);
                                            g.append('circle')
                                                .attr('r', 3)
                                                .attr('fill', 'none')
                                                .attr('stroke', 'white')
                                                .attr('stroke-width', 1);
                                        }),
                                    update => update
                                        .each(function (d) {
                                            const g = d3.select(this)
                                                .style(`transform`, `translate(${d.offset[0]}px, ${d.offset[1]}px)`);
                                        }),
                                    exit => exit.remove()
                                );

                            /*
                            aux func :: getCoordsTranslation
                             */
                            function getCoordsTranslation(r, pos) {
                                const x = Math.round(r * Math.sin(vis.vars.tool_channelScale(pos)));
                                const y = Math.round(r * Math.cos(vis.vars.tool_channelScale(pos)));
                                return [x, y];
                            }

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

                            // Draw lines / labels
                            this.vars.el_chartLabelsG.selectAll('.viewfinder_chart_label_g_g')
                                .data(this.vars.cellChannels, d => d.key)
                                .join(
                                    enter => enter
                                        .append('g')
                                        .attr('class', 'viewfinder_chart_label_g_g')
                                        .each(function (d, i) {

                                            // Get g
                                            const g = d3.select(this);

                                            // Coords
                                            const coords = [
                                                getCoordsTranslation(vis.vars.config_chartR0, i),
                                                getCoordsTranslation(vis.vars.config_chartR1, i)
                                            ];

                                            // Line
                                            const labelLine = g.append('path')
                                                .attr('class', 'labelLine')
                                                .attr('stroke', 'rgba(255, 255, 255, 1)')
                                                .attr('stroke-width', 0.5);
                                            labelLine.transition()
                                                .attr('d', d3.line()(coords));

                                            // Label group
                                            const textCoords = getCoordsTranslation(vis.vars.config_chartR1 + 5, i)
                                            const angle = vis.vars.tool_angleScale(i);
                                            g.append('g')
                                                .attr('class', 'viewfinder_chart_label_g_g_text_g')
                                                .style('transform',
                                                    `translate(${textCoords[0]}px, ${textCoords[1]}px)`)
                                                .append('text')
                                                .attr('fill', 'white')
                                                .attr('font', 'sans-serif')
                                                .attr('font-size', 9)
                                                .attr('font-weight', () => {
                                                    if (channels.includes(d.short)) return 'bold';
                                                    return 'lighter';
                                                })
                                                .attr('text-anchor', () => {
                                                    if (angle >= Math.PI) return `end`;
                                                    return `start`;
                                                })
                                                .attr('dominant-baseline', 'middle')
                                                .style('transform', () => {
                                                    if (angle >= Math.PI) return `rotate(${angle + Math.PI / 2}rad)`;
                                                    return `rotate(${angle - Math.PI / 2}rad)`;
                                                })
                                                .text(d => {
                                                    if (d.short.length <= 4) return d.short;
                                                    return d.short.substring(0, 4);
                                                });

                                            // Label group
                                            const channelCoords =
                                                getCoordsTranslation(vis.vars.config_chartR1 + 33, i + 0.05)
                                            g.append('circle')
                                                .attr('class', 'viewfinder_chart_label_g_g_circle')
                                                .attr('r', vis.vars.config_channelR)
                                                .attr('cx', channelCoords[0])
                                                .attr('cy', channelCoords[1])
                                                .attr('fill', getChannelColor(d.short, d.value))
                                                .attr('stroke', () => {
                                                    if (channels.includes(d.short)) return 'rgba(255, 255, 255, 1)';
                                                    return 'rgba(255, 255, 255, 0)';
                                                })
                                                .attr('stroke-width', 0.5);
                                        }),
                                    update => update
                                        .each(function (d, i) {

                                            // Get g
                                            const g = d3.select(this);

                                            // Label groups
                                            g.select('.viewfinder_chart_label_g_g_text_g text')
                                                .attr('class', 'viewfinder_chart_label_g_g_text_g')
                                                .attr('font-weight', () => {
                                                    if (channels.includes(d.short)) return 'bold';
                                                    return 'lighter';
                                                });

                                            // Label group
                                            g.select('.viewfinder_chart_label_g_g_circle')
                                                .attr('fill', getChannelColor(d.short, d.value))
                                                .attr('stroke', () => {
                                                    if (channels.includes(d.short)) return 'rgba(255, 255, 255, 1)';
                                                    return 'rgba(255, 255, 255, 0)';
                                                });

                                        }),
                                    exit => exit
                                );

                            // Draw path
                            this.vars.el_chartAreaPath
                                .datum(this.vars.cellChannels)
                                .transition()
                                .attr('d', d => this.vars.tool_areaMaker(d));

                            // Update nucleus area report
                            this.vars.el_nucleusG
                                .datum(cell)
                                .each(function (d) {
                                    // Define this
                                    const g = d3.select(this);

                                    // Update
                                    g.select('circle')
                                        .transition()
                                        .attr('r', () => {
                                            if (d.hasOwnProperty('NucleusArea')) {
                                                return vis.vars.tool_nucleusScale(d.NucleusArea);
                                            }
                                            return vis.vars.tool_nucleusScale(0);
                                        });
                                    g.select('.viewfinder_chart_nucleus_g_text1')
                                        .text(() => {
                                            if (d.hasOwnProperty('NucleusArea')) return d.NucleusArea;
                                            return '';
                                        });
                                });

                            // Update id
                            this.vars.el_idG.select('text')
                                .datum(cell)
                                .text(d => {
                                    if (d.hasOwnProperty('id')) return `#${d.id}`;
                                    return '';
                                });

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
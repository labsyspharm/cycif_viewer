/**
 * @class LfChannelRelationships
 */
export class LfChannelRelationships {

    // Class vars (and chart 'vars')
    data = [];
    load = [];
    vars = {
        cellIntensityRange: [0, 65536],
        config_arcFactor: 5,
        config_boxMargin: {top: 7, right: 6, bottom: 7, left: 6},
        config_boxW: 240,
        config_boxH: 240,
        config_channelR: 21,
        config_channelsR: 3,
        config_chartR: 45,
        config_offsetText: 20,
        config_offsetCirc: 40,
        currentChannel: {
            name: '',
            index: 0
        },
        el_boxExtG: null,
        el_cellsG: null,
        el_chartG: null,
        el_chartLabelsG: null,
        el_chartLinksG: null,
        el_chartChannelG: null,
        el_radialExtG: null,
        el_textReportG: null,
        tool_angleScale: d3.scaleLinear()
            .range([0, 2 * Math.PI]),
        tool_channelScale: d3.scaleLinear()
            .range([Math.PI, -Math.PI]),
        tool_colorScale: d3.scalePow()
            .exponent(0.5)
            .range(['rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 1)']),
        tool_intensityScale: d3.scaleLinear()
            .range([0.2, 1]),
        tool_lineMaker: d3.line(),
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
                    name: 'fil_data_channel_relationships',
                    vis_name: 'Data Channel Relationships',
                    settings: {
                        active: 1,
                        async: true,
                        default: 1,
                        loading: false,
                        max: 1,
                        min: 0,
                        step: 1,
                        vf: true,
                        vf_setup: 'vis_data_channel_relationships',
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

                                // Define cell, channels
                                const channels = this.channel_list.selections;

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
                        name: 'vis_data_channel_relationships',
                        init: () => {

                            // Define this
                            const vf = this.image_viewer.viewer.lensing.viewfinder;

                            // Discover first selected channel
                            const channels = this.channel_list.selections;
                            this.vars.currentChannel.name = channels[0];

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
                                .text('Channel relationships')

                            // Append chartG
                            this.vars.el_chartG = this.vars.el_boxExtG.append('g')
                                .attr('class', 'viewfinder_chart_g')
                                .style('transform', `translate(${this.vars.config_boxW / 2}px, 
                                    ${this.vars.config_boxW / 2 + this.vars.config_boxMargin.top}px)`);
                            this.vars.el_chartLabelsG = this.vars.el_chartG.append('g')
                                .attr('class', 'viewfinder_chart_label_g');
                            this.vars.el_chartLinksG = this.vars.el_chartG.append('g')
                                .attr('class', 'viewfinder_chart_link_g');
                            // this.vars.el_chartChannelG = this.vars.el_chartG.append('g')
                            //     .attr('class', 'viewfinder_chart_channel_g');
                            // this.vars.el_chartChannelG.append('circle')
                            //     .attr('class', 'viewfinder_chart_channel_g_circle')
                            //     .attr('r', this.vars.config_channelR)
                            //     .attr('fill', 'rgba(0, 0, 0, 0.75)');
                            // this.vars.el_chartChannelG.append('text')
                            //     .attr('class', 'viewfinder_chart_channel_g_text')
                            //     .attr('text-anchor', 'middle')
                            //     .attr('dominant-baseline', 'middle')
                            //     .style('fill', 'rgba(255, 255, 255, 1)')
                            //     .attr('font', 'sans-serif')
                            //     .attr('font-size', 10)
                            //     .attr('fill', 'bold');

                        },
                        wrangle: () => {

                            // Define cell
                            let cellEg = {};
                            if (this.data.length > 0) {
                                cellEg = this.data[0].data;
                            }

                            // Define cell, channels
                            const channels = this.channel_list.selections;

                            // Clear then update cell channels
                            this.vars.cellChannels = [];
                            for (let k in cellEg) {
                                if (cellEg.hasOwnProperty(k) &&
                                    channels.includes(this.data_layer.getShortChannelName(k))) {

                                    const map = this.data.map(d => d.data[k]);

                                    this.vars.cellChannels.push({
                                        key: k,
                                        short: k.split('_')[0],
                                        sum: map.reduce((a, c) => a + c)
                                    });
                                }
                            }

                            // Sort by min max
                            this.vars.cellChannels.sort((a, b) => b.sum - a.sum);

                            // Discover index of current channel
                            let currentChannelIndex = 0;
                            this.vars.cellChannels.forEach((c, i) => {
                                c.index = i;
                                if (c.short === this.vars.currentChannel.name) {
                                    currentChannelIndex = i;
                                }
                            });

                            // Put current channel first
                            this.vars.cellChannels = this.vars.cellChannels.slice(currentChannelIndex).concat(
                                this.vars.cellChannels.slice(0, currentChannelIndex));

                            // Config scales
                            this.vars.tool_angleScale.domain([0, this.vars.cellChannels.length]);
                            this.vars.tool_channelScale.domain([0, this.vars.cellChannels.length]);
                            const extent = d3.extent(this.vars.cellChannels, d => d.sum);
                            this.vars.tool_colorScale.domain(extent);
                            this.vars.tool_intensityScale.domain(extent);


                        },
                        render: () => {

                            // Define this
                            const vis = this;
                            const vf = this.image_viewer.viewer.lensing.viewfinder;

                            // Define cell, channels
                            const channels = this.channel_list.selections;

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

                            // Split data
                            const anchor = this.vars.cellChannels[0];
                            let offset = 0;
                            let anchorAdd = [];
                            let anchorSub = [];
                            if (anchor && anchor.hasOwnProperty('sum')) {
                                offset = vis.vars.tool_intensityScale(anchor.sum) / this.vars.config_arcFactor;
                                anchorAdd = getCoordsTranslation(vis.vars.config_chartR, offset);
                                anchorSub = getCoordsTranslation(vis.vars.config_chartR, -offset);
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

                                            // Label group
                                            const textCoords = getCoordsTranslation(vis.vars.config_chartR +
                                                vis.vars.config_offsetText, i);
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
                                                .attr('text-anchor', 'middle')
                                                .attr('dominant-baseline', 'middle')
                                                .text(d => {
                                                    if (d.short.length <= 4) return d.short;
                                                    return d.short.substring(0, 4);
                                                });

                                            // Label group
                                            const channelCoords = getCoordsTranslation(vis.vars.config_chartR +
                                                vis.vars.config_offsetCirc, i);
                                            g.append('circle')
                                                .attr('class', 'viewfinder_chart_label_g_g_circle')
                                                .attr('r', vis.vars.config_channelsR)
                                                .attr('cx', channelCoords[0])
                                                .attr('cy', channelCoords[1])
                                                .attr('fill', getChannelColor(d.short, vis.vars.cellIntensityRange[1]))
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

                                            // Label group
                                            const textCoords = getCoordsTranslation(vis.vars.config_chartR +
                                                vis.vars.config_offsetText, i);
                                            const angle = vis.vars.tool_angleScale(i);
                                            g.select('.viewfinder_chart_label_g_g_text_g')
                                                .style('transform',
                                                    `translate(${textCoords[0]}px, ${textCoords[1]}px)`)
                                                .select('text')
                                                .attr('font-weight', () => {
                                                    if (channels.includes(d.short)) return 'bold';
                                                    return 'lighter';
                                                })
                                                .text(d => {
                                                    if (d.short.length <= 4) return d.short;
                                                    return d.short.substring(0, 4);
                                                });

                                            // Label group
                                            const channelCoords = getCoordsTranslation(vis.vars.config_chartR +
                                                vis.vars.config_offsetCirc, i);
                                            g.select('.viewfinder_chart_label_g_g_circle')
                                                .attr('cx', channelCoords[0])
                                                .attr('cy', channelCoords[1])
                                                .attr('fill', getChannelColor(d.short, vis.vars.cellIntensityRange[1]))
                                                .attr('stroke', () => {
                                                    if (channels.includes(d.short)) return 'rgba(255, 255, 255, 1)';
                                                    return 'rgba(255, 255, 255, 0)';
                                                });
                                        }),
                                    exit => exit
                                );

                            // Draw links
                            this.vars.el_chartLinksG.selectAll('.viewfinder_chart_link_g_g')
                                .data(this.vars.cellChannels, d => d.key)
                                .join(
                                    enter => enter
                                        .append('g')
                                        .attr('class', 'viewfinder_chart_link_g_g')
                                        .each(function (d, i) {

                                            // Get g
                                            const g = d3.select(this);

                                            if (i > 0) {

                                                // Get other link coords
                                                const offset = vis.vars.tool_intensityScale(d.sum) /
                                                    vis.vars.config_arcFactor;
                                                const add = getCoordsTranslation(vis.vars.config_chartR,
                                                    i + offset);
                                                const sub = getCoordsTranslation(vis.vars.config_chartR,
                                                    i - offset);

                                                // Draw line
                                                g.append('path')
                                                    .attr('class', 'viewfinder_chart_link_g_g_path')
                                                    .attr('d', vis.vars.tool_lineMaker(
                                                        [anchorAdd, anchorSub, add, sub]))
                                                    .attr('fill', vis.vars.tool_colorScale(d.sum))
                                                // .attr('stroke', 'rgba(255, 255, 255, 1)')
                                                // .attr('stroke-width', 0.1);
                                            }

                                        }),
                                    update => update
                                        .each(function (d, i) {

                                            // Get g
                                            const g = d3.select(this);

                                            if (i > 0) {

                                                // Get other link coords
                                                const offset = vis.vars.tool_intensityScale(d.sum) /
                                                    vis.vars.config_arcFactor;
                                                const add = getCoordsTranslation(vis.vars.config_chartR,
                                                    i + offset);
                                                const sub = getCoordsTranslation(vis.vars.config_chartR,
                                                    i - offset);

                                                // Draw line
                                                g.select('.viewfinder_chart_link_g_g_path')
                                                    .transition()
                                                    .attr('fill', vis.vars.tool_colorScale(d.sum))
                                                    .attr('d', vis.vars.tool_lineMaker(
                                                        [anchorAdd, anchorSub, add, sub]));
                                            }

                                        }),
                                    exit => exit
                                );

                            // // Add anchor circ, text
                            // this.vars.el_chartChannelG.select('.viewfinder_chart_channel_g_circle')
                            //     .datum(anchor)
                            //     .attr('stroke', d => {
                            //         if (d && d.hasOwnProperty('short')) {
                            //             return getChannelColor(d.short, vis.vars.cellIntensityRange[1]);
                            //         }
                            //         return 'none';
                            //     });
                            // this.vars.el_chartChannelG.select('.viewfinder_chart_channel_g_text')
                            //     .datum(anchor)
                            //     .text(d => d && d.hasOwnProperty('short') ? d.short : '');


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
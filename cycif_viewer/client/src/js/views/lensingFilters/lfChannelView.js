/**
 * @class LfChannelView
 */
export class LfChannelView {

    // Class vars (and chart 'vars')
    data = [];
    load = [];
    vars = {
        cellIntensityRange: [0, 65536],
        config_boxW: 240,
        config_boxH: 40,
        config_colorR: 8,
        config_channelExtH: 30,
        config_boxMargin: {top: 7, right: 6, bottom: 7, left: 6},
        config_chartsMargin: {top: 10, right: 30, bottom: 10, left: 30},
        currentChannel: {
            name: '',
            index: 0
        },
        el_boxExtG: null,
        el_cellsG: null,
        el_chartsG: null,
        el_radialExtG: null,
        el_textReportG: null,
        el_toggleNoteG: null,
        forceUpdate: false,
        keydown: e => {
            if (e.key === 'C') {

                // Access auxi viewer manager (lensing instance)
                const mainManager = this.image_viewer.viewerManagerVMain;
                const auxiManager = this.image_viewer.viewerManagerVAuxi;

                // Get keys
                const keys = Object.keys(mainManager.viewer_channels);
                keys.forEach((k, i) => {
                    if (+k === this.vars.currentChannel.index) {
                        if (i < keys.length - 1) {
                            this.vars.currentChannel.name = mainManager.viewer_channels[keys[i + 1]].short_name;
                        } else {
                            this.vars.currentChannel.name = mainManager.viewer_channels[keys[0]].short_name;
                        }
                        this.vars.forceUpdate = true;
                    }
                });
            }
        }
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
                    name: 'fil_data_channel_view',
                    vis_name: 'Data Channel View',
                    settings: {
                        active: 1,
                        async: true,
                        default: 1,
                        loading: false,
                        max: 1,
                        min: 0,
                        step: 1,
                        vf: true,
                        vf_setup: 'vis_data_channel_view',
                        iter: 'px'
                    },
                    set_pixel: () => {

                        // Lensing ref
                        const lensing = this.image_viewer.viewer.lensing;

                        // Trigger update
                        lensing.viewfinder.setup.wrangle()
                        lensing.viewfinder.setup.render();

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
                        name: 'vis_data_channel_view',
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
                                .text('Channel view')

                            this.vars.el_toggleNoteG = this.vars.el_boxExtG.append('g')
                                .attr('class', 'viewfinder_toggle_note_g')
                                .style('transform', `translate(${this.vars.config_boxW
                                - this.vars.config_boxMargin.right}px, ${this.vars.config_boxMargin.top * 3}px)`);
                            this.vars.el_toggleNoteG.append('text')
                                .attr('class', 'viewfinder_toggle_note_g_char')
                                .attr('x', 15)
                                .attr('y', 0)
                                .attr('text-anchor', 'end')
                                .attr('dominant-baseline', 'hanging')
                                .attr('fill', 'white')
                                .attr('font-family', 'sans-serif')
                                .attr('font-size', 14)
                                .attr('font-weight', 'lighter')
                                .style('transform', 'rotate(90deg)')
                                .html('&#10234;');
                            this.vars.el_toggleNoteG.append('text')
                                .attr('class', 'viewfinder_toggle_note_g_char')
                                .attr('x', -15)
                                .attr('y', 2)
                                .attr('text-anchor', 'end')
                                .attr('dominant-baseline', 'hanging')
                                .attr('fill', 'rgba(255, 255, 255, 0.9)')
                                .attr('font-family', 'sans-serif')
                                .attr('font-size', 8)
                                .attr('font-style', 'italic')
                                .attr('font-weight', 'lighter')
                                .html('SHIFT C');


                            // Append chartG
                            this.vars.el_chartsG = this.vars.el_boxExtG.append('g')
                                .attr('class', 'viewfinder_charts_g')
                                .style('transform', `translate(${this.vars.config_chartsMargin.left}px, 
                                    ${this.vars.config_chartsMargin.top}px)`);

                            // Add listener
                            this.vars.keydown = this.vars.keydown.bind(this)
                            document.addEventListener('keydown', this.vars.keydown);


                        },
                        wrangle: () => {

                            // Get channels
                            const channels = this.channel_list.selections;

                            // Manually set current channel FIXME
                            if (channels.length === 0) {
                                this.vars.currentChannel.name = '';
                            }
                            if (channels.length > 0 && this.vars.currentChannel.name === '') {
                                this.vars.currentChannel.name = channels[0];
                            }

                            // Access auxi viewer manager (lensing instance)
                            const mainManager = this.image_viewer.viewerManagerVMain;
                            const auxiManager = this.image_viewer.viewerManagerVAuxi;

                            // If multi channel
                            if (Object.keys(auxiManager.viewer_channels).length > 1 || this.vars.forceUpdate) {

                                // Undo force status
                                this.vars.forceUpdate = false;

                                // Update viewer channels
                                for (let k in mainManager.viewer_channels) {

                                    // Reduce to single channel
                                    if (mainManager.viewer_channels[k].short_name === this.vars.currentChannel.name) {
                                        auxiManager.viewer_channels = {};
                                        auxiManager.viewer_channels[`${k}`] = mainManager.viewer_channels[k];
                                        this.vars.currentChannel.index = +k;
                                        auxiManager.force_repaint();
                                        break;
                                    }
                                }

                            }

                        },
                        render: () => {

                            // Define this
                            const vis = this;
                            const vf = this.image_viewer.viewer.lensing.viewfinder;

                            // Get channels
                            const channels = this.channel_list.selections;

                            // Update vf box size
                            vf.els.blackboardRect.attr('height', this.vars.config_boxH
                                + channels.length * this.vars.config_channelExtH);
                            vf.configs.boxH = this.vars.config_boxH + channels.length * this.vars.config_channelExtH;

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

                                            // Label g
                                            const labelG = g.append('g')
                                                .attr('class', 'viewfinder_charts_g_chart_g_label_g');

                                            // Append label
                                            labelG.append('circle')
                                                .attr('class', 'viewfinder_charts_g_chart_g_circle')
                                                .attr('r', vis.vars.config_colorR)
                                                .attr('fill', getChannelColor(d, vis.vars.cellIntensityRange[1]))
                                                .attr('stroke', () => {
                                                    if (channels.includes(d)) return 'rgba(255, 255, 255, 1)';
                                                    return 'rgba(255, 255, 255, 0)';
                                                })
                                                .attr('stroke-width', () => {
                                                    if (d === vis.vars.currentChannel.name) return 1.5;
                                                    return 0.5;
                                                });
                                            labelG.append('text')
                                                .attr('class', 'viewfinder_charts_g_chart_g_text')
                                                .attr('x', vis.vars.config_colorR * 2)
                                                .attr('y', vis.vars.config_colorR / 4)
                                                .attr('fill', 'rgba(255, 255, 255, 0.95)')
                                                .attr('font-family', 'sans-serif')
                                                .attr('font-size', 9)
                                                .attr('text-anchor', 'start')
                                                .attr('dominant-baseline', 'middle')
                                                .text(d);
                                        }),
                                    update => update.each(function (d, i) {
                                        const g = d3.select(this)
                                            .style('transform', `translateY(${i * vis.vars.config_channelExtH +
                                            vis.vars.config_boxH}px)`);

                                        // Label g
                                        const labelG = g.select('.viewfinder_charts_g_chart_g_label_g');

                                        // update channel color
                                        labelG.select('.viewfinder_charts_g_chart_g_circle')
                                            .attr('fill', getChannelColor(d, vis.vars.cellIntensityRange[1]))
                                            .attr('stroke', () => {
                                                if (channels.includes(d)) return 'rgba(255, 255, 255, 1)';
                                                return 'rgba(255, 255, 255, 0)';
                                            })
                                            .attr('stroke-width', () => {
                                                if (d === vis.vars.currentChannel.name) return 1.5;
                                                return 0.5;
                                            });
                                    })
                                );


                        },
                        destroy: () => {

                            // Remove handler
                            document.removeEventListener('keydown', this.vars.keydown);

                            // Re-establish channels
                            this.image_viewer.viewerManagerVAuxi.viewer_channels =
                                this.image_viewer.viewerManagerVMain.viewer_channels;
                            this.image_viewer.viewerManagerVAuxi.force_repaint();

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
/**
 * @class LfSegmentationOutlines
 * Note - useful template implementation for viewfinder functionality without viewerfinder visibility
 */
export class LfSegmentationOutlines {

    // Class vars (and chart 'vars')
    data = [];
    load = [];
    vars = {};

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
                    name: 'fil_data_segmentation_outlines',
                    vis_name: 'Data Segmentation Outlines',
                    settings: {
                        active: 1,
                        async: false,
                        default: 1,
                        loading: false,
                        max: 1,
                        min: 0,
                        step: 1,
                        vf: true,
                        vf_setup: 'vis_data_segmentation_outlines',
                        iter: 'px'
                    },
                    set_pixel: () => {

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
                        name: 'vis_data_segmentation_outlines',
                        init: () => {

                            // Hide vf
                            const vf = this.image_viewer.viewer.lensing.viewfinder;
                            vf.els.svg.attr('opacity', 0);

                            // Trigger channel list data request
                            this.channel_list.triggerChannelSelect();

                            // Show outlines
                            this.image_viewer.viewerManagerVAuxi.show_sel = true;
                            this.image_viewer.viewerManagerVAuxi.force_repaint();

                        },
                        wrangle: () => {

                        },
                        render: () => {

                        },
                        destroy: () => {

                            // Show vf
                            const vf = this.image_viewer.viewer.lensing.viewfinder;
                            vf.els.svg.attr('opacity', 1);

                            // Show outlines
                            this.image_viewer.viewerManagerVAuxi.show_sel = false;
                            this.image_viewer.viewerManagerVAuxi.force_repaint();

                        }
                    }
                },
            },
        };
    }
}
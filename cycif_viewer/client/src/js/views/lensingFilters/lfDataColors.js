/**
 * @class LfDataColors
 */
export class LfDataColors {

    // Class vars
    data = [];
    load = [];

    /**
     * @constructor
     */
    constructor() {

        // Init
        this.init()
    }


    /**
     * @function init
     *
     * @return void
     */
    init() {

        this.data = [
            {
                index: 0,
                name: 'black',
                r: 0,
                g: 0,
                b: 0
            },
            {
                index: 1,
                name: 'white',
                r: 255,
                g: 255,
                b: 255
            },
            {
                index: 2,
                name: 'red',
                r: 255,
                g: 0,
                b: 0
            },
            {
                index: 3,
                name: 'green',
                r: 0,
                g: 255,
                b: 0
            },
            {
                index: 4,
                name: 'blue',
                r: 0,
                g: 0,
                b: 255
            },
            {
                index: 5,
                name: 'light red',
                r: 255,
                g: 128,
                b: 128
            },
            {
                index: 6,
                name: 'light green',
                r: 128,
                g: 255,
                b: 128
            },
            {
                index: 7,
                name: 'light blue',
                r: 128,
                g: 128,
                b: 255
            },
        ];

        this.load = {
            data: this.data,
            config: {
                type: 'color-index',
                filter: 'fil_data_rgb'
            }
        }

    }

}
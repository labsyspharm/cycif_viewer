import Icon from "./assets/lensing_icon.svg";
import IconKeyboard from "./assets/lensing_keyboard.svg";
import IconFilterConfig from "./assets/lensing_filter_config.svg";

/**
 * @class Controls
 */
export default class Controls {

    // Vars
    slider = null;
    on = true;

    /*
    CONSTRUCTOR
     */
    constructor(_lensing) {
        // Fields
        this.lensing = _lensing;
        // Init
        this.init();
    }

    /**
     * @function build_button
     * Builds the button used as a dock for lensing
     *
     * @ returns Object
     */
    init() {

        // Configs
        const w = 38;
        const iconW = 28;
        const iconLilW = 16;
        const iconPad = (w - iconW) / 2;
        const sliderWH = [iconW, iconW * 5];

        // Build container
        const container = document.createElement('div');
        container.setAttribute('style', `height: 100%; width: ${w}px; `
            + `position: absolute; right: 0; top: 0; `
            + `display: flex; flex-flow: column nowrap; align-items: center;`
            + `visibility: ${this.on ? 'visible' : 'hidden'}`
        );

        // Append img
        this.lensing.viewer.canvas.parentElement.append(container);

        // Build icon
        // Add the image to our existing div.
        const icon = new Image();
        icon.src = Icon;
        icon.alt = 'Lensing Icon';
        icon.setAttribute('style', `height: ${iconW}px; width: ${iconW}px; `
            + `position: relative; margin: ${iconPad}px;`
        );
        container.appendChild(icon);

        // Build lens report
        this.lensReport = document.createElement('div');
        this.lensReport.setAttribute('style',
            `position: absolute; right: ${iconW + iconPad * 3}px; top: 12px;`
            + `color: white; font-family: sans-serif; font-size: 10px; font-style: italic; font-weight: lighter; `
            + `white-space: nowrap;`
        );
        container.appendChild(this.lensReport);
        this.update_report();

        // Build iconKeyboard
        const iconKeyboard = new Image();
        iconKeyboard.src = IconKeyboard;
        iconKeyboard.alt = 'Keyboard Icon';
        iconKeyboard.setAttribute('style', `height: ${iconLilW}px; width: ${iconLilW}px; `
            + `position: relative; margin: ${iconPad / 2}px;`
        );
        container.appendChild(iconKeyboard);

        // Build iconFilterConfig
        const iconFilterConfig = new Image();
        iconFilterConfig.src = IconFilterConfig;
        iconFilterConfig.alt = 'Keyboard Icon';
        iconFilterConfig.setAttribute('style', `height: ${iconLilW}px; width: ${iconLilW}px; `
            + `position: relative; margin: ${iconPad / 2}px;`
        );
        container.appendChild(iconFilterConfig);

        // Build slider - TODO: style the range handle
        this.slider = document.createElement('input');
        this.slider.setAttribute('type', 'range');
        this.slider.setAttribute('min', '0');
        this.slider.setAttribute('max', '255');
        this.slider.setAttribute('value', '127');
        this.slider.setAttribute('step', '1');
        this.slider.setAttribute('style', `width: ${sliderWH[1]}px; height: ${2}px; `
            + `position: relative; margin-top: ${sliderWH[1] / 2 + 10}px; `
            + `-webkit-appearance: none; appearance: none; transform: rotate(90deg); outline: white; `
            + `background-color: black; border: 1px solid rgba(255, 255, 255, 0.2);`
        );
        container.append(this.slider);

        // Add event
        this.slider.addEventListener('change', this.handle_slider_change.bind(this));

    }

    /**
     * @function handle_slider_change
     * Passes event to lenses.
     *
     * @param {Event} e
     *
     * returns void
     */
    handle_slider_change(e) {

        // Update val
        this.lensing.lenses.update_filter(e.target.value)
    }

    /**
     * @function update_report
     * Updates lens report in controls
     *
     * returns void
     */
    update_report() {

        // Update val
        this.lensReport.innerHTML = `${this.lensing.lenses.selections.filter.vis_name} `
            + `${this.lensing.lenses.selections.magnifier.settings.active}X `
            + `${this.lensing.lenses.selections.magnifier.vis_name}`
    }

}
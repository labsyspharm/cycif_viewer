export class Utils {

    /**
     * @function getPositionKeys
     * @param {any} d
     *
     * @returns {string}
     * TODO - add area to config.json (featureData[...])
     */
    static getAreaTerm(d) {
        // Init
        const whitelist = ['NucleusArea', 'AREA'];
        const keys = Object.keys(d);
        // Filter, return
        return whitelist.find(w => keys.includes(w));
    }

    /**
     * @function getChannelColor
     * @param {any} d
     * @param {number} val
     * @param {any} imageViewer
     * @param {any} channelList
     *
     * @returns {string}
     */
    static getChannelColor(name, val, imageViewer, channelList) {
        if (channelList.selections.includes(name)) {
            // Find channel TF
            let channelTF = null;
            for (let k in imageViewer.channelTF) {
                if (imageViewer.channelTF.hasOwnProperty(k) && imageViewer.channelTF[k].name === name) {
                    channelTF = imageViewer.channelTF[k];
                    break;
                }
            }
            if (channelTF) {
                // Retrieve color
                const rgb = imageViewer.viewerManagerVMain.evaluateTF(val, channelTF);
                return `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;
            }
        }
        return 'none';
    }

    /**
     * @function getChannelIndex
     */
    static getChannelIndex(name ,imageViewer) {
       return imageViewer.config.imageData.findIndex(d => d.name === name);
    }

    /**
     * @function getImageChannels
     *
     * @param {any} d
     * @param {any} imageViewer
     *
     * @returns {array}
     */
    static getImageChannels(d, imageViewer) {
        // Iterate, recognize, place, return
        const imgData = imageViewer.config.imageData.map(img => img.fullname);
        const arr = [];
        for (const [k, v] of Object.entries(d)) {
            if (d.hasOwnProperty(k) && imgData.includes(k) && v) arr.push(k);
        }
        return arr;
    }

    /**
     * @function getPositionKeys
     * @param {any} d
     *
     * @returns {array}
     */
    static getPositionKeys(d) {
        return [config.featureData[0].xCoordinate, config.featureData[0].yCoordinate];
    }
}
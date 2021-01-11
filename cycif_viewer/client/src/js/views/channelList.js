class ChannelList {

    constructor(config, dataLayer, eventHandler) {
        this.config = config;
        this.eventHandler = eventHandler;
        this.dataLayer = dataLayer;
        this.selections = [];
        this.maxSelections = 4;
        this.ranges = {};
        this.sliders = new Map();
        var that = this;
        this.imageBitRange = [0, 65536];
        this.sel = {};

        //  create a color picker
        this.rainbow = rainbow();
        this.colorTransferHandle = null;
        d3.select(document.body)//add it to body
            .call(this.rainbow
                .on('save', (color, x) => {
                    let data = this.colorTransferHandle.datum();
                    let packet = {
                        name: data.name,  // cell name :  string
                        type: data.color,         // white, black :  string
                        color,     // parse using d3.rgb(color) : https://github.com/d3/d3-color#rgb
                    };
                    this.eventHandler.trigger(ChannelList.events.COLOR_TRANSFER_CHANGE, packet);
                    this.colorTransferHandle.style('fill', color);
                })
                .on('close', () => this.colorTransferHandle = null));

        this.container = d3.select("#channel_list");
    }

    removeChannel(name) {

        // Update selections
        delete this.sel[dataLayer.getFullChannelName(name)];

        // Trigger
        // this.eventHandler.trigger(ChannelList.events.CHANNEL_SELECT, this.sel);
    }

    selectChannel(name) {

        // Update selections
        this.selections.push(name);
        this.sel[dataLayer.getFullChannelName(name)] = this.imageBitRange;

        // Trigger
        // this.eventHandler.trigger(ChannelList.events.CHANNEL_SELECT, this.sel);
    }

    triggerChannelSelect() {

        // Trigger
        this.eventHandler.trigger(ChannelList.events.CHANNEL_SELECT, this.sel);
    }

    async init() {
        this.rainbow.hide();
        this.columns = await this.dataLayer.getChannelNames(true);
        // Hide the Loader
        document.getElementById('channel_list_loader').style.display = "none";
        let list = document.getElementById('channel_list_group')
        // Will show the picker when you click on a color rect
        let showPicker = e => {
            this.colorTransferHandle = d3.select(e.target);
            let color = this.colorTransferHandle.style('fill');
            let hsl = d3.hsl(color);
            this.rainbow.show(e.clientX, e.clientY);
        };
        // Draws rows in the channel list
        _.each(this.columns, column => {
            // div for each row in channel list
            let listItemParentDiv = document.createElement("div");
            listItemParentDiv.classList.add("list-group-item");
            listItemParentDiv.classList.add("container");
            listItemParentDiv.classList.add("channel-list-content");
            // row
            let row = document.createElement("div");
            row.classList.add("row");
            listItemParentDiv.appendChild(row);
            // row
            let row2 = document.createElement("div");
            row2.classList.add("row");
            listItemParentDiv.appendChild(row2);

            // column within row that contains the name of the channel
            let nameCol = document.createElement("div");
            nameCol.classList.add("col-md-4");
            nameCol.classList.add("channel-col");
            row.appendChild(nameCol);

            // column within row that Contains the slider for the channel
            let sliderCol = document.createElement("div");
            sliderCol.classList.add("col-md-12");
            sliderCol.classList.add("channel-slider");
            sliderCol.setAttribute('id', "channel-slider_" + column)
            row2.appendChild(sliderCol);

            // column within row that contains svg for color pickers
            let svgCol = document.createElement("div");
            svgCol.classList.add("col-md-4");
            svgCol.classList.add("ml-auto");
            svgCol.classList.add("channel-col");
            svgCol.classList.add("channel-svg-wrapper");
            svgCol.classList.add("col-svg-wrapper");
            row.appendChild(svgCol);

            let colorLabel = document.createElement("span");
            colorLabel.textContent = "Color:";
            svgCol.appendChild(colorLabel);

            let svg = d3.select(svgCol)
                .append("svg")
                .attr("width", 30)
                .attr("height", 15)
            svg.selectAll("circle")
                .data([{"color": "black", "name": column}, {"color": "white", "name": column}])
                .enter().append("rect")
                .attr("class", "color-transfer")
                .attr("cursor", "pointer")
                .attr("stroke", "#757575")
                .attr("fill", d => d.color)
                .attr("width", "10")
                .attr("height", "10")
                .attr("rx", "2")
                .attr("ry", "2")
                .attr("x", d => {
                    if (d.color == "black") {
                        return 3;
                    } else { //black
                        return 17;
                    }
                })
                .attr("y", "2")
                .on('pointerup', showPicker);
            //<rect class="color-transfer" cursor="pointer" stroke="#757575" fill="black" width="10" height="10" rx="2" ry="2" x="-5" y="4.725680443548387" transform="translate(65,0)"></rect>
            svgCol.style.display = "none";

            let channelName = document.createElement("span");
            channelName.classList.add("channel-name");
            channelName.textContent = column;
            nameCol.appendChild(channelName);

            listItemParentDiv.addEventListener("click", e => this.abstract_click(e, svgCol));
            list.appendChild(listItemParentDiv);

            //add and hide channel sliders (will be visible when channel is active)
            this.addSlider(this.imageBitRange, this.imageBitRange, column, document.getElementById("channel_list").getBoundingClientRect().width);
            d3.select('div#channel-slider_' + column).style('display', "none");
        });
    }


    /**
     * @function abstract_click
     *
     * @param e
     * @param svgCol
     */
    abstract_click(event, svgCol) {

        // If you clicked on the svg, ignore this behavior
        if (event.target.closest("svg")) {
            return;
        }

        // Get info
        let parent = event.target.closest(".list-group-item");
        let name = parent.querySelector('.channel-name').textContent;
        let status = !parent.classList.contains("active");

        // If active - else inactive
        if (status) {

            // Clear everything
            // clearOut();

            // Don't add channel is the max are selected
            if (_.size(this.selections) >= this.maxSelections) {
                return;
            }

            // Update properties and add slider
            d3.select(parent).classed("active", true);
            svgCol.style.display = "block";
            d3.select('div#channel-slider_' + name).style('display', "block")

            // Add channel
            this.selectChannel(name);

        } else {
            // Clear panel visibility
            // clearOut();
            this.selections = _.pull(this.selections, name);

            // Remove channel and rerender
            this.removeChannel(name);

            // Hide
            d3.select(parent).classed("active", false);
            svgCol.style.display = "none";
            d3.select('div#channel-slider_' + name).style('display', "none")

            // Trigger viewer cleanse
            // this.eventHandler.trigger(ChannelList.events.CHANNELS_CHANGE, this.selections);
        }

        //
        let selectionsHeaderDiv = document.getElementById("selected-channels-header-div");
        if (selectionsHeaderDiv) {
            if (_.size(this.selections) >= this.maxSelections) {
                selectionsHeaderDiv.classList.add('bold-selections-header');
            } else {
                selectionsHeaderDiv.classList.remove('bold-selections-header');
            }
            let packet = {selections: this.selections, name, status};
            // console.log('channels_change', packet);
            document.getElementById("num-selected-channels").textContent = _.size(this.selections);

            // Trigger event
            this.eventHandler.trigger(ChannelList.events.CHANNELS_CHANGE, packet);

        }
    }

    /*
    add a slider
    @data the min and max range of the slider
    @activeRange the predefined values for the lower and upper handle
    @name the name of the slider (used as part of the id)
    @swidth the pixel width of the slider
     */
    addSlider(data, activeRange, name, swidth) {

        var that = this;
        //add range slider row content
        var sliderSimple = d3.sliderBottom()
            .min(d3.min(data))
            .max(d3.max(data))
            .width(swidth - 60)//.tickFormat(d3.format("s"))
            .fill('orange')
            .ticks(5)
            .default(activeRange)
            .handle(
                d3.symbol()
                    .type(d3.symbolCircle)
                    .size(100)
            )
            .tickValues([]).on('onchange', range => {
                let packet = {name: name, dataRange: range};
                this.eventHandler.trigger(ChannelList.events.BRUSH_END, packet);
            });
        this.sliders.set(name, sliderSimple);

        //create the slider svg and call the slider
        var gSimple = d3
            .select('#channel-slider_' + name)
            .append('svg')
            .attr('class', 'svgslider')
            .attr('width', swidth)
            .attr('height', 30)
            .append('g')
            .attr('transform', 'translate(20,10)');
        gSimple.call(sliderSimple);

        //slider value to be displayed closer to the slider than default
        d3.selectAll('.parameter-value').select('text')
            .attr("y", 10);

        return sliderSimple;
    };
}

window.addEventListener("resize", function () {
    //reinitialize slider on window change..(had some bug updating with via d3 update)
    if (typeof channelList != "undefined" && channelList) {
        channelList.sliders.forEach(function (slider, name) {
            d3.select('div#channel-slider_' + name).select('svg').remove();
            channelList.addSlider(channelList.imageBitRange, slider.value(), name,
                document.getElementById("channel_list").getBoundingClientRect().width);
        });
    }
});

//static vars
ChannelList.events = {
    BRUSH_MOVE: "BRUSH_MOVE",
    BRUSH_END: "BRUSH_END",
    COLOR_TRANSFER_CHANGE_MOVE: "COLOR_TRANSFER_CHANGE_MOVE",
    COLOR_TRANSFER_CHANGE: "COLOR_TRANSFER_CHANGE",
    CHANNELS_CHANGE: "CHANNELS_CHANGE",
    CHANNEL_SELECT: "CHANNEL_SELECT"
};
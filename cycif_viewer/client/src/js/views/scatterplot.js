class Scatterplot {
    constructor(id, eventHandler, dataLayer) {
        this.id = id;
        this.eventHandler = eventHandler;
        this.dataLayer = dataLayer;
    }

    async init(visData) {
        const self = this;
        this.visData = visData;
        let colorScheme = d3.scaleSequential(d3.interpolateInferno)
            .domain([0, _.size(this.visData.clusters) + 2])
        this.colorMap = _.map(this.visData.clusters, cluster => {
            let obj = {}
            obj.hex = colorScheme(cluster + 1);
            obj.rgba = webglColor(obj.hex);
            // Per https://tannerhelland.com/2011/10/01/grayscale-image-algorithm-vb6.html
            let grayScale = (obj.rgba[0] * 0.3 + obj.rgba[1] * 0.59 + obj.rgba[2] * 0.11)
            obj.grayRgba = [grayScale, grayScale, grayScale, 0.8];
            return obj;
        })
        const xScale = d3.scaleLinear().domain([visData.xMin, visData.xMax]);
        const yScale = d3.scaleLinear().domain([visData.yMin, visData.yMax]);
        const xScaleOriginal = xScale.copy();
        const yScaleOriginal = yScale.copy();

        self.color = d3.scaleOrdinal() // D3 Version 4
            .domain(Object.keys(this.colorMap))
            .range(_.map(this.colorMap, elem => {
                    return elem.rgba;
                }
            ));

        self.legendColors = self.color.copy();
        let rgbaColors = _.map(self.color.range(), glColor => {
            return `rgba(${_.toInteger(glColor[0] * 255)},${_.toInteger(glColor[1] * 255)},${_.toInteger(glColor[2] * 255)},${glColor[3]})`
        });
        self.legendColors.range(rgbaColors);

        self.legend = d3.legendColor()
            .orient('vertical')
            .shapePadding(0)
            .titleWidth(100)
            .labelOffset(5)
            .shapeWidth(10)
            .shapeHeight(10)
            .scale(self.legendColors)
            .on("cellclick", function (d) {
                let cluster = d3.select(this).data()[0]
                self.recolor(cluster = cluster);
            });

        const createAnnotationData = datapoint => ({
            note: {
                label: `ID: ${datapoint.id}`,
                bgPadding: 5,
                title: "Test"
            },
            x: datapoint.x,
            y: datapoint.y,
            dx: 20,
            dy: 20
        });

        self.pointSeries = fc
            .seriesWebglPoint()
            .equals((a, b) => a === b)
            .size(1)
            .crossValue(d => d.x)
            .mainValue(d => d.y);

        const zoom = d3
            .zoom()
            .scaleExtent([0.8, 10])
            .on("zoom", (event) => {
                // update the scales based on current zoom
                xScale.domain(event.transform.rescaleX(xScaleOriginal).domain());
                yScale.domain(event.transform.rescaleY(yScaleOriginal).domain());
                self.redraw();
            });

        self.annotations = [];

        const pointer = fc.pointer().on("point", ([coord]) => {
            self.annotations.pop();

            if (!coord || !quadtree) {
                return;
            }

            // find the closes datapoint to the pointer
            const x = xScale.invert(coord.x);
            const y = yScale.invert(coord.y);
            const radius = Math.abs(xScale.invert(coord.x) - xScale.invert(coord.x - 20));
            const closestDatum = quadtree.find(x, y, radius);

            // if the closest point is within 20 pixels, show the annotation
            if (closestDatum) {
                self.annotations[0] = createAnnotationData(closestDatum);
            }

            self.redraw();
        });

        const annotationSeries = seriesSvgAnnotation()
            .notePadding(15)
            .type(d3.annotationCallout);

        self.chart = fc
            .chartCartesian(xScale, yScale)
            .webglPlotArea(
                // only render the point series on the WebGL layer
                fc
                    .seriesWebglMulti()
                    .series([self.pointSeries])
                    .mapping(d => d.data)
            )
            .svgPlotArea(
                // only render the annotations series on the SVG layer
                fc
                    .seriesSvgMulti()
                    .series([annotationSeries])
                    .mapping(d => d.annotations)
            )
            .decorate((selection) => {
                let sel = selection.enter()


                sel.append('svg')
                    .attr('class', 'legend')
                    .attr("width", "30px")
                    .attr("height", "300px")
                //
                sel.select('.legend')
                    .attr("transform", "translate(0,20)")
                    .call(self.legend);

                sel.select("d3fc-svg.plot-area")
                    .on("measure.range", (event) => {
                        xScaleOriginal.range([0, event.detail.width]);
                        yScaleOriginal.range([event.detail.height, 0]);
                    })
                    .call(zoom)
                    .call(pointer)

            });
        let quadtree;
        const pointFill = d => {
            return self.color(d.cluster);
        }

        const fillColor = fc.webglFillColor().value(pointFill).data(self.visData.data);
        self.pointSeries.decorate(program => fillColor(program));

        // wire up the fill color selector
        iterateElements(".controls a", el => {
            el.addEventListener("click", () => {
                iterateElements(".controls a", el2 => el2.classList.remove("active"));
                el.classList.add("active");
                fillColor.value(pointFill);
                self.redraw();
            });
        });

        // create a spatial index for rapidly finding the closest datapoint
        quadtree = d3
            .quadtree()
            .x(d => d.x)
            .y(d => d.y)
            .addAll(this.visData.data);

        self.selectedCluster = null;


        // render the chart with the required data
        // Enqueues a redraw to occur on the next animation frame
        this.redraw();
    }

    redraw() {
        const self = this;
        let annotations = self.annotations;
        let data = self.visData.data;
        d3.select(`#${this.id}`).datum({annotations, data}).call(self.chart);
        let legendSvg = d3.select('.legend')
            .data([self.legendColors]);
        legendSvg.enter()
            .append('g')
            .attr('class', 'legend');
        legendSvg.call(self.legend);
        legendSvg.exit()
            .remove();
    }

    recolor(cluster = null, ids = null) {
        const self = this;
        let prevColorRange = self.color.range();

        if (cluster) {
            self.color.range(_.map(prevColorRange, (thisColor, i) => {
                if (self.selectedCluster != cluster && cluster != _.toString(i)) {
                    return self.colorMap[i].grayRgba;
                } else {
                    return self.colorMap[i].rgba;
                }
            }))

            self.legendColors.range(_.map(self.color.range(), thisColor => {
                return `rgba(${_.toInteger(thisColor[0] * 255)},${_.toInteger(thisColor[1] * 255)},${_.toInteger(thisColor[2] * 255)},${thisColor[3]})`
            }))
            const pointFill = d => {
                return self.color(d.cluster);
            }
            const fillColor = fc.webglFillColor().value(pointFill).data(self.visData.data);
            self.pointSeries.decorate(program => fillColor(program));
            if (self.selectedCluster == cluster) {
                self.selectedCluster = null;
            } else {
                self.selectedCluster = cluster;
            }
            this.eventHandler.trigger(Scatterplot.events.selectCluster, self.selectedCluster)
        } else if (ids) {
            let idDict = {}
            _.forEach(ids,cell=>{
                idDict[cell.id] = true
            })
            self.color.range(_.map(prevColorRange, (thisColor, i) => {
                return self.colorMap[i].rgba;
            }))

            self.legendColors.range(_.map(self.color.range(), thisColor => {
                return `rgba(${_.toInteger(thisColor[0] * 255)},${_.toInteger(thisColor[1] * 255)},${_.toInteger(thisColor[2] * 255)},${thisColor[3]})`
            }))
            const pointFill = d => {
                if (idDict[d.id])
                    return self.colorMap[d.cluster].rgba
                else
                    return self.colorMap[d.cluster].grayRgba;
            }
            const fillColor = fc.webglFillColor().value(pointFill).data(self.visData.data);
            self.pointSeries.decorate(program => fillColor(program));
            if (self.selectedCluster == cluster) {
                self.selectedCluster = null;
            } else {
                self.selectedCluster = cluster;
            }
        }
        self.redraw();
    }
}

Scatterplot.events = {
    selectCluster: 'selectCluster'
};

const distance = (x1, y1, x2, y2) => {
    const dx = x1 - x2,
        dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
};

const trunc = (str, len) =>
    str.length > len ? str.substr(0, len - 1) + "..." : str;

const hashCode = s =>
    s.split("").reduce((a, b) => {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
    }, 0);

const webglColor = color => {
    const {r, g, b, opacity} = d3.color(color).rgb();
    return [r / 255, g / 255, b / 255, opacity];
};

const iterateElements = (selector, fn) =>
    [].forEach.call(document.querySelectorAll(selector), fn);

const seriesSvgAnnotation = () => {
    // the underlying component that we are wrapping
    const d3Annotation = d3.annotation();

    let xScale = d3.scaleLinear();
    let yScale = d3.scaleLinear();

    const join = fc.dataJoin("g", "annotation");

    const series = selection => {
        selection.each((data, index, group) => {
            const projectedData = data.map(d => ({
                ...d,
                x: xScale(d.x),
                y: yScale(d.y)
            }));

            d3Annotation.annotations(projectedData);

            join(d3.select(group[index]), projectedData).call(d3Annotation);
        });
    };

    series.xScale = (...args) => {
        if (!args.length) {
            return xScale;
        }
        xScale = args[0];
        return series;
    };

    series.yScale = (...args) => {
        if (!args.length) {
            return yScale;
        }
        yScale = args[0];
        return series;
    };

    fc.rebindAll(series, d3Annotation);

    return series;
};
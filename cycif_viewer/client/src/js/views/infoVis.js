class InfoVis {
    constructor(id, eventHandler) {
        this.id = id;
        this.eventHandler = eventHandler;
    }

    renderCanvasScatterplot = function (visdata) {

        if (d3.select("#axis-svg").empty()) {
            //eventhandler

            // constants
            var numberPoints = visdata.data.length;
            var subsetSize = 0; //later..
            var zoomEndDelay = 200;

            //zoom
            var k = 1;

            //meta
            //strings to arrays
            // var labels = visdata.clusters.labels.split(',');
            // var colors = visdata.clusters.colors.split(',');
            // var order = visdata.clusters.reorder.split(',');

            // timeout function
            var zoomEndTimeout;

            // save the index of the currently selected point
            var selectedPoint;

            // define all size variables
            var margin = {top: 10, right: 10, bottom: 30, left: 30};
            const fullWidth = 400;
            const fullHeight = 400;
            var formatter = d3.format(".2n");
            var width = fullWidth - margin.left - margin.right;
            var height = fullHeight - margin.top - margin.bottom;


            //add svg (for axis and stuff)
            var div = d3.select("#" + this.id).append('div')
                .style('width', fullWidth + 'px')
                .style('height', fullHeight + 'px')
            // .style('background-color', 'black');

            div.append("svg")
                .attr('id', 'axis-svg')
                .attr('class', 'plot');

            var divLegend = d3.select("#" + this.id).append('div')
                .style('width', fullWidth + 'px')
                .style('height', 100 + 'px')
            // .style('background-color', 'black');

            divLegend
                .append("svg")
                .attr('id', 'axis-svg-legend');

            //add canvas (for the actual plot)
            div.append('canvas')
                .attr('id', 'plot-canvas')
                .attr('class', 'plot');

            //load data
            subsetSize = Math.min(visdata.data.length, 10000);

            console.log('shifting data');
            let data = visdata.data.map(function (d, i) {
                return [parseFloat(d.x), parseFloat(d.y), d, i, false]
            });

            // create a quadtree for fast hit detection
            var quadTree = d3.quadtree(data);

            // selected sample random numbers -- this is the subset of points
            // drawn during 'zoom' events
            var randomIndex = _.sampleSize(data, subsetSize);

            var pointRadius = 1.5, opacity = 0.5;
            if (data.length <= 100) {
                pointRadius = 5.5;
                opacity = 1.0;
            } else if (data.length <= 1000) {
                pointRadius = 4;
                opacity = 0.90;
            } else if (data.length <= 10000) {
                pointRadius = 3;
                opacity = 0.75;
            } else if (data.length <= 100000) {
                pointRadius = 2;
                opacity = 0.60;
            } else if (data.length <= 1000000) {
                pointRadius = 1;
                opacity = 0.50;
            }

            // the canvas is shifted by 1px to prevent any artefacts
            // when the svg axis and the canvas overlap
            var canvas = d3.select("#plot-canvas")
                .attr("width", width - 1)
                .attr("height", height - 1)
                .style("transform", "translate(" + (margin.left + 1) +
                    "px" + "," + (margin.top + 1) + "px" + ")");

            var svg = d3.select("#axis-svg")
                .attr("width", fullWidth)
                .attr("height", fullHeight)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," +
                    margin.top + ")");

            var svgLegend = d3.select("#axis-svg-legend")
                .attr("width", fullWidth)
                .attr("height", 100)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," +
                    margin.top + ")");

            // ranges, scales, axis, objects
            var xRange = d3.extent(data, function (d) {
                return d[0]
            });
            var yRange = d3.extent(data, function (d) {
                return d[1]
            });

            var xScale = d3.scaleLinear()
                .domain([xRange[0], xRange[1]])
                .range([0, width]);
            var x2 = xScale.copy();
            //var x3 = xScale.copy();

            var yScale = d3.scaleLinear()
                .domain([yRange[0], yRange[1]])
                .range([height, 0]);
            var y2 = yScale.copy();
            //var y3 = yScale.copy();

            var xAxis = d3.axisBottom()
                .scale(xScale)
                .tickSizeInner(-height)
                .tickSizeOuter(0)
                .tickPadding(10)

            var yAxis = d3.axisLeft()
                .scale(yScale)
                .tickSizeInner(-width)
                .tickSizeOuter(0)

            // create zoom behaviour
            var zoomBehaviour = d3.zoom()
                .scaleExtent([1, 100])
                .on("zoom", onZoom)
                .on("end", onZoomEnd);

            // append x-axis, y-axis
            var xAxisSvg = svg.append('g')
                .attr('class', 'x axis')
                .attr('transform', 'translate(0,' + height + ')')
                .call(xAxis);

            var yAxisSvg = svg.append('g')
                .attr('class', 'y axis')
                .call(yAxis);

            // on onclick handler
            canvas.on("click", onClick);

            // add zoom behaviour
            canvas.call(zoomBehaviour);

            // get the canvas drawing context
            var context = canvas.node().getContext('2d');

            draw();

            function onClick() {
                var mouse = d3.mouse(this);

                // map the clicked point to the data space
                var xClicked = xScale.invert(mouse[0]);
                var yClicked = yScale.invert(mouse[1]);

                // find the closest point in the dataset to the clicked point
                var closest = quadTree.find(xClicked, yClicked);

                // map the co-ordinates of the closest point to the canvas space
                var dX = xScale(closest[0]);
                var dY = yScale(closest[1]);

                // register the click if the clicked point is in the radius of the point
                var distance = euclideanDistance(mouse[0], mouse[1], dX, dY);

                if (distance < pointRadius * 10) {
                    if (selectedPoint) {
                        data[selectedPoint][4] = false;
                    }
                    closest[4] = true;
                    selectedPoint = closest[3];

                    // redraw the points
                    draw();
                    events.clickHandler(cellPos(closest[2]));
                }
            }

            var cellPos = function (d) {
                return [parseInt(d['X_position']), parseInt(d['Y_position'])];
            }

            function onZoom() {
                xScale = d3.event.transform.rescaleX(x2);
                xAxis.scale(xScale);
                xAxisSvg.call(xAxis);

                yScale = d3.event.transform.rescaleY(y2);
                yAxis.scale(yScale);
                yAxisSvg.call(yAxis);

                k = d3.event.transform.k;
                // var xRangeDiff = Math.abs(xRange[1] - xRange[0]);
                // var rangeNow = Math.abs(xScale.domain()[1] - xScale.domain()[0]);
                // var diff = (rangeNow/xRangeDiff) * 100;
                // k= Math.min(100,1 + 100-diff);

                clearTimeout(zoomEndTimeout);
                if (k < 5) {
                    draw(randomIndex);
                } else {
                    draw();
                }
            }

            function onZoomEnd() {
                // when zooming is stopped, create a delay before
                // redrawing the full plot
                zoomEndTimeout = setTimeout(function () {
                    draw();
                }, zoomEndDelay);
            }


            // the draw function draws the full dataset if no index
            // parameter supplied, otherwise it draws a subset according
            // to the indices in the index parameter
            function draw(index) {
                var active;

                context.clearRect(0, 0, fullWidth, fullHeight);
                // context.fillStyle = "rgba(255, 255, 255, 0.5)";
                // context.strokeWidth = 1;
                // context.strokeStyle = 'white';

                // if an index parameter is supplied, we only want to draw points
                // with indices in that array
                if (index) {
                    index.forEach(function (i) {
                        var point = data[i[3]];
                        if (!point[4]) {
                            drawPoint(false, point, pointRadius);
                        } else {
                            active = point;
                        }
                    });
                }
                // draw the full dataset otherwise
                else {
                    data.forEach(function (point) {
                        if (!point[4]) {
                            drawPoint(false, point, pointRadius);
                        } else {
                            active = point;
                        }
                    });
                }

                // ensure that the actively selected point is drawn last
                // so it appears at the top of the draw order
                if (active) {
                    drawPoint(true, active, pointRadius);
                    // context.fillStyle = "rgba(255, 255, 255, 0.5)";
                }
            }

            function drawPoint(isActive, point, r) {

                //if in viewport
                if (point[0] >= d3.extent(xScale.domain())[0] && point[0] <= d3.extent(xScale.domain())[1]
                    && point[1] >= d3.extent(yScale.domain())[0] && point[1] <= d3.extent(yScale.domain())[1]) {

                    var cx = xScale(point[0]);
                    var cy = yScale(point[1]);

                    if (!isActive) {
                        // var hexColor = colors[point[2].clust_ID-1];
                        let color = d3.rgb("steelblue");
                        // var color = d3.rgb("#" + colors[parseInt(point[2].clust_ID) - 1]);
                        color.opacity = opacity;
                        context.fillStyle = color + "";
                        context.beginPath();
                        context.arc(cx, cy, r * (k / 10.0), 0, 2 * Math.PI);
                        context.fill();
                    } else {
                        let color = d3.rgb("steelblue");
                        // var color = d3.rgb("#" + colors[parseInt(point[2].clust_ID) - 1]);
                        context.strokeStyle = '#FFA500';
                        context.lineWidth = 5;
                        context.fillStyle = color + "";
                        context.beginPath();
                        context.arc(cx, cy, r * (k / 10.0), 0, 2 * Math.PI);
                        context.fill();
                        context.stroke();
                    }
                }
            }

            function euclideanDistance(x1, y1, x2, y2) {
                return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
            }

            //config driven color coding
            var color = d3.scaleOrdinal()
                .domain(labels)
                .range(colors);

            // the legend shows the clusters in a different order, defined by the user
            sortedColors = colors.slice().sort(function (a, b) {
                return order.indexOf(labels[colors.indexOf(a)]) - order.indexOf(labels[colors.indexOf(b)]);
            });
            var sortedColor = d3.scaleOrdinal()
                .domain(order)
                .range(sortedColors);

            // draw legend
            var n = labels.length / 2;
            var itemWidth = 80;
            var itemHeight = 18;


            var legend = svgLegend.selectAll(".legend")
                .data(sortedColor.domain())
                .enter().append("g")
                .attr("transform", function (d, i) {
                    return "translate(" + ((i % n * itemWidth) - fullWidth * 0.7) + "," + ((Math.floor(i / n) * itemHeight * 1.2)) + ")";
                })
                .attr("class", "legend")
            // .attr("transform", function (d, i) {
            //     return "translate(0," + i * 20 + ")";
            // });

            // draw legend colored rectangles
            legend.append("rect")
                .attr("x", width - 18)
                .attr("width", 18)
                .attr("height", 18)
                .style("fill", sortedColor);

            // draw legend text
            legend.append("text")
                .attr("x", width - 24)
                .attr("y", 9)
                .attr("dy", ".35em")
                .style("text-anchor", "end")
                .text(function (d) {
                    return d;
                }).attr('font-size', '0.8em')
                .attr('fill', 'white');

            //there is a zooming bug, thus currently outcommented
            const zoomAndHighlightPoint = (d) => {
                // console.log('in scatterplot: ' + d.x + d.y);
                // var closest = fromImageQuadTree.find(d.x, d.y);
                // closest[4] = true;
                // selectedPoint = closest[3];
                //
                // //we set the viewport, so that it shows an area where the selected point is in (with some context around it)
                //
                // xScale.domain([parseFloat(closest[2][visdata.axes.x])-1, parseFloat(closest[2][visdata.axes.x])+1]);
                // x2 = xScale.copy();
                // xAxis.scale(xScale);
                // xAxisSvg.call(xAxis);
                //
                // yScale.domain([parseFloat(closest[2][visdata.axes.y])-1, parseFloat(closest[2][visdata.axes.y])+1]);
                // y2 = yScale.copy();
                // yAxis.scale(yScale);
                // yAxisSvg.call(yAxis);
                //
                // //finally draw the stuff..
                // draw();

            }//register method with event handler
            // this.eventHandler.bind(eventHandler.events.osdClickEvent, zoomAndHighlightPoint);

        }
    }
}


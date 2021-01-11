class Barchart {
    constructor(id, colorScheme) {
        this.id = id;
        this.parent = d3.select(`#${id}`)
        this.colorScheme = colorScheme;
    }

    init(visData) {
        this.margin = {top: 10, right: 10, bottom: 100, left: 40},
            this.width = this.parent.node().getBoundingClientRect().width - this.margin.left - this.margin.right,
            this.height = this.parent.node().getBoundingClientRect().height - this.margin.top - this.margin.bottom;

        this.svg = d3.select("#barchart_display").append("svg")
            .attr("id", "barchart_svg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .append("g")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
        this.svgSelector = document.getElementById("barchart_svg");
        this.svgSelector.style.display = "none";
        this.x = d3.scaleBand()
            .rangeRound([0, this.width], .1)
            .paddingInner(0.1);

        this.y = d3.scaleLinear()
            .range([this.height, 0]);

        this.xAxis = d3.axisBottom()
            .scale(this.x);

        this.yAxis = d3.axisLeft()
            .scale(this.y)

        this.svg.append("g")
            .attr("class", "xaxis")
            .attr("transform", "translate(0," + this.height + ")")
            .call(this.xAxis)


        this.svg.append("g")
            .attr("class", "yaxis")
            .call(this.yAxis)
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text("Weighted Neighborhood Contribution");
        this.visData = visData;
    }

    draw(cluster) {
        const self = this;
        self.svgSelector.style.display = "block";
        let chartData = _.get(self.visData, `[${cluster}].cluster_summary.weighted_contribution`, []);
        self.x.domain(chartData.map(function (d) {
            return _.keys(d)[0]
        }));
        self.y.domain([0, d3.max(chartData, function (d) {
            return _.values(d)[0]
        })]);


        d3.select(".xaxis")
            .transition()
            .duration(100)
            .call(this.xAxis)
            .selectAll("text")
            .attr("y", 0)
            .attr("x", 9)
            .attr("dy", ".35em")
            .attr("transform", "rotate(90)")
            .style("text-anchor", "start");

        d3.select(".yaxis")
            .transition()
            .duration(100)
            .call(this.yAxis)


        let bars = self.svg.selectAll(".bar")
            .data(chartData)
        bars.enter()
            .append("rect")
            .merge(bars)
            .attr("class", "bar")
            .transition()
            .duration(500)
            .attr("x", function (d) {
                return self.x(_.keys(d)[0]);
            })
            .attr("width", self.x.bandwidth())
            .attr("y", function (d) {
                return self.y(_.values(d)[0]);
            })
            .attr("height", function (d) {
                return self.height - self.y(_.values(d)[0]);
            })
            .attr("fill", function (d) {
                return `#${self.colorScheme.colorMap[_.keys(d)[0]].hex}`
            });
        bars.exit().remove()
    }

    hide() {
        const self = this;
        self.svgSelector.style.display = "none";

    }

}
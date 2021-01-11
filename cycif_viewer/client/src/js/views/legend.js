class Legend {
    constructor(phenotypes, colorScheme) {
        this.parentSelector = "legend";
        this.svg = d3.select(`#${this.parentSelector}`)
            .append("svg")
            .attr("width", '120px')
            .attr("height", '160px')
            .attr("id", "legend-svg");
        this.phenotypes = phenotypes;
        this.colorScheme = colorScheme;

    }

    draw() {
        const size = 10;
        let docHeight = 30 + _.size(this.phenotypes) * (size + 3);
        let colorMap = this.colorScheme.colorMap;
        let data = _.map(this.phenotypes, phenotype => {
            return {'phenotype': phenotype, 'color': `${colorMap[phenotype].hex}`};
        })
        // document.getElementById(this.parentSelector).setAttribute("height", `${docHeight}px`);
        // document.getElementById('legend-svg').setAttribute("height", `${docHeight}px`);
        this.svg.append("rect")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("fill", "white")
        this.svg.append("text")
            .text("Phenotype")
            .attr("class", "legend-title")
            .attr("x", 3)
            .attr("y", 10)
            .attr("font-size", "0.65rem")


        let rects = this.svg.selectAll(".myrects")
            .data(data)
        rects.enter()
            .append("rect")
            .attr("class", "myrects")
            .merge(rects)
            .attr("x", 3)
            .attr("y", function (d, i) {
                return 15 + i * (size + 1)
            }) // 100 is where the first dot appears. 25 is the distance between dots
            .attr("width", size)
            .attr("height", size)
            .style("fill", d => {
                return d.color;
            })
        rects.exit().remove();

        let labels = this.svg.selectAll(".mylabels")
            .data(data)
        labels.enter()
            .append("text")
            .attr("class", "mylabels")
            .merge(labels)
            .attr("x", 3 + size * 1.2)
            .attr("y", function (d, i) {
                return 15 + i * (size + 1) + (size / 2)
            }) // 100 is where the first dot appears. 25 is the distance between dots
            .style("fill", d => {
                return '#000000';
            })
            .text(d => {
                let phenotype = d.phenotype;
                if (phenotype == "") {
                    return "No Phenotype";
                }
                return phenotype;
            })
            .attr("text-anchor", "left")
            .style("alignment-baseline", "middle")
        labels.exit().remove();

        // if (this.selectedCell) {
        //     this.fillCellIcon(this.selectedCell.phenotype);
        // }
    }
}
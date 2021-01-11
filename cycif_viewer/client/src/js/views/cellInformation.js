class CellInformation {
    constructor(phenotypes, colorScheme) {
        this.svg = d3.select("#cell_legend");
        this.phenotypes = phenotypes;
        this.colorScheme = colorScheme;
        this.selectedCell = null;
        this.draw();
        let neighborhoodButton = document.getElementById("compute_neighborhood_button");
        let slider = document.getElementById("formControlRange");
        let value = document.getElementById("distance");
        value.textContent = slider.value;

        let sliderDown = false;
        slider.oninput = function () {
            value.textContent = this.value;
        }
        slider.addEventListener("mousedown", function (e) {
            sliderDown = true;
        });
        slider.addEventListener("mouseup", function (e) {
            sliderDown = false;
        });
        slider.addEventListener("mousemove", function (e) {
            if (sliderDown) {
                eventHandler.trigger(CellInformation.events.drawNeighborhoodRadius, {
                    'distance': slider.value,
                    'selectedCell': cellInformation.selectedCell,
                    'dragging': true
                });
            }
        });
        slider.onchange = function () {
            eventHandler.trigger(CellInformation.events.drawNeighborhoodRadius, {
                'distance': slider.value,
                'selectedCell': cellInformation.selectedCell,
                'dragging': false
            });
        }
        neighborhoodButton.onclick = function () {
            eventHandler.trigger(CellInformation.events.computeNeighborhood, {
                'distance': slider.value,
                'selectedCell': cellInformation.selectedCell
            });
        }

        let refreshColorsButton = document.getElementById("refresh_colors");
        refreshColorsButton.onclick = function () {
            eventHandler.trigger(CellInformation.events.refreshColors, {});
        }


    }

    draw() {
        const size = 10;
        let docHeight = 20 + _.size(this.phenotypes) * (size + 5);
        let colorMap = this.colorScheme.colorMap;
        let data = _.map(this.phenotypes, phenotype => {
            return {'phenotype': phenotype, 'color': `${colorMap[phenotype].hex}`};
        })
        document.getElementById('cell_legend').setAttribute("height", `${docHeight}px`);

        let rects = this.svg.selectAll(".myrects")
            .data(data)
        rects.enter()
            .append("rect")
            .attr("class", "myrects")
            .merge(rects)
            .attr("x", 0)
            .attr("y", function (d, i) {
                return 10 + i * (size + 5)
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
            .attr("x", 0 + size * 1.2)
            .attr("y", function (d, i) {
                return 10 + i * (size + 5) + (size / 2)
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

    selectCell(selectedItem) {
        this.selectedCell = selectedItem;
        let phenotype = selectedItem.phenotype || '';
        // this.fillCellIcon(phenotype);
        if (phenotype == '') {
            phenotype = "None";
        }
        document.getElementById("phenotype").textContent = phenotype;
    }

    // fillCellIcon(phenotype) {
    //     let path = _.first(document.getElementById("cell_icon").getElementsByTagName('path'));
    //     path.setAttribute('style', `fill: ${this.colorScheme.colorMap[phenotype].hex}`);
    // }
}

CellInformation.events = {
    computeNeighborhood: 'computeNeighborhood',
    refreshColors: 'refreshColors',
    drawNeighborhoodRadius: 'drawNeighborhoodRadius'
};
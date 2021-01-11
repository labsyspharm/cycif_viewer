class Starplot {
    constructor(id, phenotypes, small = false) {
        this.id = id;
        this.small = small;
        this.parent = d3.select(`#${id}`);
        this.selector = document.getElementById(id);
        this.phenotypes = phenotypes;
    }

    init() {
        const self = this;
        this.margin = {top: 40, right: 20, bottom: 60, left: 20},
            this.width = this.parent.node().getBoundingClientRect().width - this.margin.left - this.margin.right,
            this.height = this.parent.node().getBoundingClientRect().height - this.margin.top - this.margin.bottom;

        this.svg = d3.select(`#${this.id}`).append("svg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .attr("class", "radar" + this.id);

        this.tool_angleScale = d3.scaleLinear()
            .range([0, 2 * Math.PI]);
        this.tool_areaMaker = d3.areaRadial()
            .curve(d3.curveCardinalClosed)

        this.tool_channelScale = d3.scaleLinear()
            .range([Math.PI, -Math.PI]);

        this.tool_radiusScale = d3.scaleLinear()
            .domain([0, 1]);
        if (this.small) {
            this.config_chartR0 = 5;
            this.config_chartR1 = 40;
        } else {
            this.config_chartR0 = 15;
            this.config_chartR1 = 65;
        }
        this.tool_logRadiusScale = d3.scaleSymlog()
            .domain([0, 2000])
            .range([this.config_chartR0, this.config_chartR1])

        this.tool_logRadiusScale.clamp(true);
// Main chart
        this.el_boxExtG = this.svg.append('g')
            .attr('class', 'viewfinder_box_ext_g');


        // Main chart
        // Append chartG
        this.el_chartG = this.el_boxExtG.append('g')
            .attr('class', 'viewfinder_chart_g')
            .style('transform', `translate(${this.width / 2}px, 
        ${this.height / 2 + this.margin.top}px)`);
        // Lines and labels for the chart
        this.el_chartLabelsG = this.el_chartG.append('g')
            .attr('class', 'viewfinder_chart_label_g');

        // Actual area chart
        this.el_chartAreaPath = this.el_chartG.append('path')
            .attr('class', 'viewfinder_chart_area_path')
            .attr('fill', 'rgba(155, 155, 155, 0.9');
        let i = -1;
        let emptyData = _.keyBy(_.times(_.size(this.phenotypes), _.constant(0)), d => {
            return this.phenotypes[++i];
        })
        return this.wrangle(emptyData);


    }

    wrangle(data, order = null) {
        const self = this;
        if (!order) {
            order = self.phenotypes;
        }

        this.visData = _.map(data, (v, k) => {
            return {
                key: k,
                short: k,
                value: v,
                index: _.indexOf(order, k)
            }
        })

        this.visData = _.sortBy(this.visData, ['index']);
        this.range = [_.minBy(this.visData, elem => elem.value).value,
            _.maxBy(this.visData, elem => elem.value).value];

        // Config
        this.tool_angleScale.domain([0, this.visData.length]);
        this.tool_channelScale.domain([0, this.visData.length]);

        this.tool_radiusScale
            .range([this.config_chartR0, this.config_chartR1])
        this.tool_areaMaker
            .innerRadius(d => this.tool_logRadiusScale(0))
            .outerRadius(d => this.tool_logRadiusScale(d.value))
            .angle(d => this.tool_angleScale(d.index));
        return this.draw()
    }

    draw() {
        const self = this;
        // Define this
        /*

        /*
        aux func :: getCoordsTranslation
         */
        function getCoordsTranslation(r, pos) {
            const x = Math.round(r * Math.sin(self.tool_channelScale(pos)));
            const y = Math.round(r * Math.cos(self.tool_channelScale(pos)));
            return [x, y];
        }


        // Draw lines / labels
        this.el_chartLabelsG.selectAll('.viewfinder_chart_label_g_g')
            .data(this.visData, d => d.key)
            .join(
                enter => enter
                    .append('g')
                    .attr('class', 'viewfinder_chart_label_g_g')
                    .each(function (d, i) {
                        // Get g
                        const g = d3.select(this);

                        // Coords
                        const coords = [
                            getCoordsTranslation(self.config_chartR0, i),
                            getCoordsTranslation(self.config_chartR1, i)
                        ];

                        // Line
                        const labelLine = g.append('path')
                            .attr('class', 'labelLine')
                            .attr('stroke', 'rgba(155, 155, 155, 1)')
                            .attr('stroke-width', 0.5);
                        labelLine.transition()
                            .attr('d', d3.line()(coords));


                        // Label group
                        const textCoords = getCoordsTranslation(self.config_chartR1 + 5, i)
                        const angle = self.tool_angleScale(i);
                        g.append('g')
                            .attr('class', 'viewfinder_chart_label_g_g_text_g')
                            .style('transform',
                                `translate(${textCoords[0]}px, ${textCoords[1]}px)`)
                            .append('text')
                            .attr('fill', 'black')
                            .attr('font', 'sans-serif')
                            .attr('font-size', d => {
                                if (self.small) {
                                    return 5;
                                } else {
                                    return 7;
                                }
                            })
                            .attr('text-anchor', () => {
                                if (angle >= Math.PI) return `end`;
                                return `start`;
                            })
                            .attr('dominant-baseline', 'middle')
                            .style('transform', () => {
                                if (angle >= Math.PI) return `rotate(${angle + Math.PI / 2}rad)`;
                                return `rotate(${angle - Math.PI / 2}rad)`;
                            })
                            .text(d => {
                                return d.short;
                            });

                        // Label group
                        const channelCoords =
                            getCoordsTranslation(self.config_chartR1 + 33, i + 0.05)
                        g.append('circle')
                            .attr('class', 'viewfinder_chart_label_g_g_circle')
                            .attr('r', self.config_channelR)
                            .attr('cx', channelCoords[0])
                            .attr('cy', channelCoords[1])
                            .attr('fill', 'grey')
                            .attr('stroke', () => {
                                return 'rgb(155,155,155)'
                            })
                            .attr('stroke-width', 0.5);
                    }),
                update => update
                    .each(function (d, i) {

                        // Get g
                        const g = d3.select(this);

                        // Label groups
                        g.select('.viewfinder_chart_label_g_g_text_g text')
                            .attr('class', 'viewfinder_chart_label_g_g_text_g')
                            .attr('font-weight', () => {
                                if (self.small) {
                                    return 'normal';
                                } else {
                                    return 'bold';
                                }
                            });

                        // Label group
                        g.select('.viewfinder_chart_label_g_g_circle')
                            .attr('fill', 'grey')
                            .attr('stroke', () => {
                                return 'rgba(155, 155, 155)';
                            });

                    }),
                exit => exit
            );

        // Draw path
        this.el_chartAreaPath
            .datum(this.visData)
            .transition()
            .attr('d', d => {
                let max = _.maxBy(d, function (o) {
                    return o.value;
                }).value;
                let min = _.minBy(d, function (o) {
                    return o.value;
                }).value;
                // If there are no values, draw a blank path
                if (min == max && min == 0) {
                    return '';
                } else {
                    return self.tool_areaMaker(d);
                }

            });
    }

    hide() {

    }

}
//todo add crossfilter stuff here... build some lensingFilters and sorters for individual and combined dimensions

class DataLayer {

    constructor(config, imageChannels) {
        var that = this;
        //vars and consts
        this.config = config;
        //all image channels
        this.imageChannels = imageChannels;
        //selections
        this.currentSelection = new Map();
        this.currentRawSelection = {};
        //x,z coords
        this.x = this.config["featureData"][dataSrcIndex]["xCoordinate"];
        this.y = this.config["featureData"][dataSrcIndex]["yCoordinate"];
        this.phenotypes = [];
    }

    async init() {
        try {
            let response = await fetch('/init_datasource?' + new URLSearchParams({
                datasource: datasource
            }))
            let response_data = await response.json();
            this.phenotypes = await this.getPhenotypes();

        } catch (e) {
            console.log("Error Initializing Dataset", e);
        }
    }

    async getCells(ids) {
        try {
            let response = await fetch('/get_cells', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(
                    {
                        datasource: datasource,
                        elem: {
                            'ids': ids.points
                        }
                    })
            });
            let response_data = await response.json();
            return response_data;
        } catch (e) {
            console.log("Error Getting Cells", e);
        }
    }

    async getChannelCellIds(sels) {
        try {
            let response = await fetch('/get_channel_cell_ids?' + new URLSearchParams({
                filter: JSON.stringify(sels),
                datasource: datasource
            }))
            let cellIds = await response.json();
            return cellIds;
        } catch (e) {
            console.log("Error Getting Channel Cell Ids", e);
        }
    }

    async getChannelNames(shortNames = true) {
        try {
            let response = await fetch('/get_channel_names?' + new URLSearchParams({
                datasource: datasource,
                shortNames: shortNames
            }))
            let response_data = await response.json();
            return response_data;
        } catch (e) {
            console.log("Error Getting Sample Row", e);
        }
    }

    async getColorScheme(refresh = false, field = 'phenotype') {
        try {
            let response = await fetch('/get_color_scheme?' + new URLSearchParams({
                datasource: datasource,
                field: field,
                refresh: refresh
            }))
            let response_data = await response.json();
            return response_data;
        } catch (e) {
            console.log("Error Getting Sample Row", e);
        }
    }

    async getPhenotypes() {
        try {
            let response = await fetch('/get_phenotypes?' + new URLSearchParams({
                datasource: datasource
            }))
            let response_data = await response.json();
            return response_data;
        } catch (e) {
            console.log("Error Getting Phenotypes", e);
        }
    }


    async getNeighborhoods() {
        try {
            let response = await fetch('/get_neighborhood_list?' + new URLSearchParams({
                datasource: datasource
            }))
            let response_data = await response.json();
            return response_data;
        } catch (e) {
            console.log("Error Getting Neighborhoods", e);
        }
    }

    async getAllNeighborhoodStats() {
        try {
            let response = await fetch('/get_all_neighborhood_stats?' + new URLSearchParams({
                datasource: datasource
            }))
            let response_data = await response.json();
            return response_data;
        } catch (e) {
            console.log("Error Getting All Neighborhoods", e);
        }
    }


    async editNeighborhood(id, editField, editValue) {
        try {
            let response = await fetch('/edit_neighborhood', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(
                    {
                        datasource: datasource,
                        elem: {
                            'id': id,
                            'editField': editField,
                            'editValue': editValue
                        }
                    })
            });
            let response_data = await response.json();
            return response_data;
        } catch (e) {
            console.log("Error Editing Neighborhood", e);
        }
    }

    async deleteNeighborhood(id) {
        try {
            let response = await fetch('/delete_neighborhood', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(
                    {
                        datasource: datasource,
                        elem: {
                            'id': id
                        }
                    })
            });
            let response_data = await response.json();
            return response_data;
        } catch (e) {
            console.log("Error Deleting Neighborhood", e);
        }
    }

    async getNeighborhood(id) {
        try {
            let response = await fetch('/get_neighborhood', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(
                    {
                        datasource: datasource,
                        elem: {
                            'id': id
                        }
                    })
            });
            let response_data = await response.json();
            return response_data;
        } catch (e) {
            console.log("Error Getting Neighborhood", e);
        }
    }

    async saveNeighborhood() {
        const self = this;
        try {
            let response = await fetch('/save_neighborhood', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(
                    {
                        datasource: datasource,
                        selection: self.getCurrentRawSelection(),
                        isCluster: false
                    }
                )
            });
            let response_data = await response.json();
            return response_data;
        } catch (e) {
            console.log("Error Saving Neighborhood", e);
        }
    }

    async getNearestCell(point_x, point_y) {
        try {
            let response = await fetch('/get_nearest_cell?' + new URLSearchParams({
                point_x: point_x,
                point_y: point_y,
                datasource: datasource
            }))
            let cell = await response.json();
            return cell;
        } catch (e) {
            console.log("Error Getting Nearest Cell", e);
        }
    }

    async getIndividualNeighborhood(maxDistance, x, y) {
        try {
            let response = await fetch('/get_individual_neighborhood?' + new URLSearchParams({
                point_x: x,
                point_y: y,
                max_distance: maxDistance,
                datasource: datasource
            }))
            let neighborhood = await response.json();
            return neighborhood;
        } catch (e) {
            console.log("Error Getting Nearest Cell", e);
        }
    }

    async getClusterCells() {
        try {
            let response = await fetch('/get_cluster_cells?' + new URLSearchParams({
                datasource: datasource
            }))
            let clusterCells = await response.json();
            return clusterCells;
        } catch (e) {
            console.log("Error Getting Nearest Cell", e);
        }
    }

    async getCellsInPolygon(points, similar = false) {
        try {
            let response = await fetch('/get_cells_in_polygon?' + new URLSearchParams({
                datasource: datasource,
                points: JSON.stringify(points),
                similar_neighborhood: similar
            }))
            let cells = await response.json();
            return cells;
        } catch (e) {
            console.log("Error Getting Polygon Cells", e);
        }
    }

    async getSimilarNeighborhoodToSelection(similarity) {
        try {
            let response = await fetch('/get_similar_neighborhood_to_selection', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(
                    {
                        datasource: datasource,
                        similarity: similarity,
                        selectionIds: [...this.getCurrentSelection().keys()]
                    })
            });
            let cells = await response.json();
            return cells;
        } catch (e) {
            console.log("Error Getting Similar Neighborhood", e);
        }
    }


    async getScatterplotData() {
        try {
            let response = await fetch('/get_scatterplot_data?' + new URLSearchParams({
                datasource: datasource
            }))
            let scatterplotData = await response.json();
            return scatterplotData;
        } catch (e) {
            console.log("Error Getting Nearest Cell", e);
        }
    }


    async getNeighborhoodForCell(maxDistance, selectedCell) {
        return this.getIndividualNeighborhood(maxDistance, selectedCell[this.x], selectedCell[this.y]);
    }

    getCurrentSelection() {
        return this.currentSelection;
    }

    getCurrentRawSelection() {
        return this.currentRawSelection;
    }


    clearCurrentSelection() {
        this.currentSelection.clear();
        this.currentRawSelection.clear();

    }


    addToCurrentSelection(item, allowDelete, clearPriors) {

        // delete item on second click
        if (allowDelete && this.currentSelection.has(item)) {
            this.currentSelection.delete(item);
            if (clearPriors) {
                this.currentSelection.clear();
            }

            // console.log('current selection size:', this.currentSelection.size);
            if (this.currentSelection.size > 0) {
                // console.log('id: ', this.currentSelection.values().next().value.id);
            }
            return;
        }

        // clear previous items
        if (clearPriors) {
            this.currentSelection.clear();
        }

        // add new item
        this.currentSelection.set(item.id, item);

        // console.log('current selection size:', this.currentSelection.size);
        if (this.currentSelection.size > 0) {
            // console.log('id: ', this.currentSelection.values().next().value.id);
        }
    }


    addAllToCurrentSelection(items, allowDelete, clearPriors) {
        // console.log("update current selection")
        var that = this;
        that.currentSelection = new Map(items.cells.map(i => [i.id, i]));
        that.currentRawSelection = items;
        // console.log("update current selection done")
    }

    isImageFeature(key) {
        if (this.imageChannels.hasOwnProperty(key)
            && key != 'CellId' && key != 'id' && key != 'CellID' && key != 'ID' && key != 'Area') {
            return true;
        }
        return false;
    }

    getShortChannelName(fullname) {
        var shortname = fullname;
        this.config["imageData"].forEach(function (channel) {
            if (channel.fullname == fullname) {
                shortname = channel.name;
            }
        });
        return shortname;
    }

    getFullChannelName(shortname) {
        var fullname = shortname;
        this.config["imageData"].forEach(function (channel) {
            if (channel.name == shortname) {
                fullname = channel.fullname;
            }
        });
        return fullname;
    }

    async getMetadata() {
        try {
            let response = await fetch('/get_ome_metadata?' + new URLSearchParams({
                datasource: datasource
            }))
            let response_data = await response.json();
            return response_data;
        } catch (e) {
            console.log("Error Getting Metadata", e);
        }
    }

}

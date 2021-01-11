import {LfNearestCell} from "./lensingFilters/lfNearestCell";
import {LfNearestCells} from "./lensingFilters/lfNearestCells";
import {LfChannelView} from "./lensingFilters/lfChannelView";
import {LfSegmentationOutlines} from "./lensingFilters/lfSegmentationOutlines";
import {LfChannelRelationships} from "./lensingFilters/LfChannelRelationships";

/**
 * @class LensingFiltersExt
 */
export class LensingFiltersExt {

    /**
     * @function getFilters
     *
     * @param _imageViewer
     * @returns array
     */
    static getFilters(_imageViewer) {

        /////////////////////////////////////////////////////////////////////////////////////// Data load - channel view
        const lfChannelView = new LfChannelView(_imageViewer);

        ////////////////////////////////////////////////////////////////////////////////////// Data load - nearest cells
        const lfNearestCells = new LfNearestCells(_imageViewer);

        /////////////////////////////////////////////////////////////////////////////////////// Data load - nearest cell
        const lfNearestCell = new LfNearestCell(_imageViewer);

        ////////////////////////////////////////////////////////////////////////////// Data load - segmentation outlines
        const lfSegmentationOutlines = new LfSegmentationOutlines(_imageViewer);

        ////////////////////////////////////////////////////////////////////////////// Data load - channel relationships
        const lfChannelRelationships = new LfChannelRelationships(_imageViewer);

        // Add in reverse order
        return [
            lfSegmentationOutlines.load,
            lfChannelView.load,
            lfNearestCells.load,
            lfNearestCell.load,
            lfChannelRelationships.load
        ];

    }
}

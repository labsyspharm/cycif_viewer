import {Buffer} from 'buffer/';
import {PNG} from 'pngjs';
import 'popper.js';
import 'jquery';
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';


import 'pngjs';
import * as d3base from 'd3';
import {sliderBottom} from 'd3-simple-slider';
import createScatterplot from 'regl-scatterplot';

import {annotation} from 'd3-svg-annotation';
import {legendColor} from 'd3-svg-legend'
import colorbrewer from 'colorbrewer';
import 'lodash';
import 'jquery-form';
import '@fortawesome/fontawesome-free/js/all';
import Sortable from 'sortablejs';
import Mark from 'mark.js';
import $ from 'jquery';
import 'node-fetch';
import convert from 'color-convert';
import * as OpenSeadragon from 'openseadragon';
import {ViewerManager} from './views/viewerManager';


window.d3 = Object.assign(d3base, {legendColor, sliderBottom, annotation});
window.convert = convert;
window.$ = $;
window.d3 = d3;
window.colorbrewer = colorbrewer;
window.d3.sliderBottom = sliderBottom;
window.PNG = PNG;
window.Buffer = Buffer;
window.Sortable = Sortable;
window.Mark = Mark;
window.OpenSeadragon = OpenSeadragon;
window.ViewerManager = ViewerManager;
window.createScatterplot = createScatterplot;


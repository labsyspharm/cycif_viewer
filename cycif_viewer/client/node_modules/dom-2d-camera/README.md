# DOM 2D Camera

[![npm version](https://img.shields.io/npm/v/dom-2d-camera.svg)](https://www.npmjs.com/package/dom-2d-camera)
[![build status](https://travis-ci.org/flekschas/dom-2d-camera.svg?branch=master)](https://travis-ci.org/flekschas/dom-2d-camera)
[![gzipped size](http://img.badgesize.io/https://unpkg.com/dom-2d-camera/dist/dom-2d-camera.min.js?compression=gzip&style=flat-square&color=6ae3c7)](https://unpkg.com/dom-2d-camera/dist/dom-2d-camera.min.js)
[![code style prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![demo](https://img.shields.io/badge/demo-online-6ae3c7.svg)](https://flekschas.github.io/regl-scatterplot/)

> A wrapper for [camera-2d](https://github.com/flekschas/camera-2d) that supports pan, zoom, and rotate.

Controls are as follows:

- Pan - Left click and hold + mouse move
- Zoom - Scroll or Alt + Left click and hold with vertical mouse move
- Rotate - Right click or Control + Left click

Based on [orbit-camera](http://github.com/mikolalysenko/orbit-camera).

Also see:

- [regl-scatterplot](https://github.com/flekschas/regl-scatterplot) for an application and a [demo](https://flekschas.github.io/regl-scatterplot/).

## Install

```
npm i dom-2d-camera

// Peer dependencies are not automatically included. To install them do:
npm i camera-2d-simple gl-matrix
```

## API

```javascript
import createDom2dCamera from "dom-2d-camera";
```

### camera = createDom2dCamera(element, options = {})

Binds a [`camera-2d-simple`](https://github.com/flekschas/camera-2d) instance to the DOM `element`. This effectively attaches event listeners required for pan&zoom interaction.

The following options are available:

- `distance`: initial distance of the camera. [dtype: number, default: `1`]
- `target`: x, y position the camera is looking in GL coordinates. [dtype: array of numbers, default: `[0,0]`]
- `rotation`: rotation in radians around the z axis. [dtype: number, default: `0`]
- `isNdc`: if `true` the camera operates in [normalized device coordinates](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_model_view_projection). This is useful when the camera is used in a WebGL program. [dtype: bool, default: `false`]
- `isFixed`: if `true` panning, rotating, and zooming is disabled. [dtype: bool, default: `false`]
- `isPan`: if `true` panning is enabled. [dtype: bool, default: `true`]
- `panSpeed`: initial panning speed. [dtype: number, default: `1`]
- `isRotate`: if `true` rotation is enabled. [dtype: bool, default: `true`]
- `rotateSpeed`: initial panning speed. [dtype: number, default: `1`]
- `isZoom`: if `true` zooming is enabled. [dtype: bool, default: `true`]
- `zoomSpeed`: initial zooming speed. [dtype: number, default: `1`]
- `scaleBounds`: see [camera-2d](https://github.com/flekschas/camera-2d#createCamera) [dtype: array, default: `null`]
- `viewCenter`: see [camera-2d](https://github.com/flekschas/camera-2d#createCamera) [dtype: array, default: `null`]
- `onKeyDown`: callback handler for `keyDown` [dtype: function, default: `() => {}`]
- `onKeyUp`: callback handler for `keyUp` [dtype: function, default: `() => {}`]
- `onMouseDown`: callback handler for `mouseDown` [dtype: function, default: `() => {}`]
- `onMouseUp`: callback handler for `mouseUp` [dtype: function, default: `() => {}`]
- `onMouseMove`: callback handler for `mouseMove` [dtype: function, default: `() => {}`]
- `onWheel`: callback handler for `wheel` [dtype: function, default: `() => {}`]

**Returns** a new 2D camera object.

**Note** the event callback functions are always triggered _after_ the camera updated! This is useful if your main application wants to listen to that specific event _and_ be sure that the camera is up to date.

The [camera's API](https://github.com/flekschas/camera-2d#api) is augmented with the following additional endpoints:

#### `camera.tick()`

Call this at the beginning of each frame to update the current position of the camera.

#### `camera.refresh()`

Call after the width and height of the related canvas object changed.

_Note: the camera does **not** update the width and height unless you tell it to using this function!_

**Returns** `[relX, relY]` the WebGL position of `x` and `y`.

#### `camera.dispose()`

Unsubscribes all event listeners.

#### `camera.config(options)`

Configure the canvas camera. `options` accepts the following options:

- `isFixed`: if `true` panning, rotating, and zooming is disabled. [default: `false`]
- `isPan`: if `true` panning is enabled. [dtype: bool, default: `true`]
- `panSpeed`: panning speed. [dtype: float, default: `1.0`]
- `isRotate`: if `true` rotation is enabled. [dtype: bool, default: `true`]
- `rotateSpeed`: rotation speed. [dtype: float, default: `1.0`]
- `isZoom`: if `true` zooming is enabled. [dtype: bool, default: `true`]
- `zoomSpeed`: zooming speed. [dtype: float, default: `1.0`]

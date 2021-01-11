# 2D Camera

[![npm version](https://img.shields.io/npm/v/camera-2d-simple.svg)](https://www.npmjs.com/package/camera-2d-simple)
[![stability experimental](https://img.shields.io/badge/stability-experimental-orange.svg)](https://nodejs.org/api/documentation.html#documentation_stability_index)
[![build status](https://travis-ci.org/flekschas/camera-2d.svg?branch=master)](https://travis-ci.org/flekschas/camera-2d)
[![gzipped size](https://img.shields.io/badge/gzipped%20size-0.8%20KB-6ae3c7.svg)](https://unpkg.com/camera-2d-simple)
[![code style prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![demo](https://img.shields.io/badge/demo-online-6ae3c7.svg)](https://flekschas.github.io/regl-scatterplot/)

> Simple camera built on top of gl-matrix for 2D scenes. Heavily inspired by [Mikola's Orbit Camera](https://github.com/mikolalysenko/orbit-camera).

Also see:

- [dom-2d-camera](https://github.com/flekschas/dom-2d-camera) for attaching the camera to a DOM object
- [regl-scatterplot](https://github.com/flekschas/regl-scatterplot) for an application

## Install

```
npm install camera-2d-simple
```

## API

```javascript
import createCamera from "camera-2d-simple";
```

### Constructor

<a name="createCamera" href="#createCamera">#</a> <b>createCamera</b>(<i>target = [0,0]</i>, <i>distance = 1</i>, <i>rotation = 0</i>, <i>viewCenter = [0,0]</i>, <i>scaleBounds = [0,Infinity]</i>)

Creates a 2d camera looking at `target` from a certain `distance`.

- `target` is the 2d vector the camera is looking at.
- `distance` is the distance between the target and the camera.
- `rotation` is angle in radiance around the z axis with respect to the viewport center.
- `viewCenter` is the center point of the canvas w.r.t the view coordinates. When operating in normalized-device coordinates this must be `[0,0]` but the center can differ when operating in pixel coordinates.
- `scaleBounds` are the min and max allowed scalings.

**Returns** A new 2d camera object

### Properties

<a name="camera.view" href="#camera.view">#</a> camera.<b>view</b>

The current view matrix (`mat4`) of the camera.

<a name="camera.viewCenter" href="#camera.viewCenter">#</a> camera.<b>viewCenter</b>

The current view center.

<a name="camera.translation" href="#camera.translation">#</a> camera.<b>translation</b>

The camera translation needed to look at the `target`.

<a name="camera.target" href="#camera.target">#</a> camera.<b>target</b>

The camera center in normalized device coordinates. This is a shorthand for inverseOf(`camera.view`) \* `[0,0,0,1]`.

<a name="camera.scaling" href="#camera.scaling">#</a> camera.<b>scaling</b>

The camera scaling. Larger scaling means the camera is closer to the target. This is the inverse of [`distance`](#camera.distance), i.e., `1 / distance`.

<a name="camera.scaleBounds" href="#camera.scaleBounds">#</a> camera.<b>scaleBounds</b>

The scale limits.

<a name="camera.distance" href="#camera.distance">#</a> camera.<b>distance</b>

Distance of the camera to the target. This is the inverse of [`scaling`](#camera.scaling), i.e., `1 / scaling`.

<a name="camera.rotation" href="#camera.rotation">#</a> camera.<b>rotation</b>

Rotation in radians around the z axis.

### Methods

<a name="camera.lookAt" href="#camera.lookAt">#</a> camera.<b>lookAt</b>(<i>target = [0,0]</i>, <i>distance = 1</i>, <i>rotation = 0</i>)

Move the camera center to `target` given the `distance` and `rotation`.

<a name="camera.translate" href="#camera.translate">#</a> camera.<b>translate</b>(<i>[x,y]</i>)

Moves the center of the camera by `x` and `y` pixel.

<a name="camera.pan" href="#camera.pan">#</a> camera.<b>pan</b>(<i>[x,y]</i>)

Same as [`camera.translate()`](#camera.translate)

<a name="camera.scale" href="#camera.scale">#</a> camera.<b>scale</b>(<i>delta</i>, <i>scaleCenter</i>)

Zooms in or out by `delta` with respect to `scaleCenter` in `[x,y]`. The new distance will be `distance * delta`.

<a name="camera.zoom" href="#camera.zoom">#</a> camera.<b>zoom</b>(<i>delta</i>, <i>scaleCenter</i>)

Same as [`camera.scale()`](#camera.scale)

<a name="camera.rotate" href="#camera.rotate">#</a> camera.<b>rotate</b>(<i>angle</i>)

Rotate the camera by `angle` (in radians) around the z axis with respect to the viewport center.

<a name="camera.setScaleBounds" href="#camera.setScaleBounds">#</a> camera.<b>setScaleBounds</b>(<i>bounds</i>)

Set the scaling limits. Expects a tuple of the min and max allowed scale factors.

<a name="camera.setView" href="#camera.setView">#</a> camera.<b>setView</b>(<i>view</i>)

Set the camera to the `view` matrix (`mat4`).

<a name="camera.setViewCenter" href="#camera.setViewCenter">#</a> camera.<b>setViewCenter</b>(<i>viewCenter</i>)

Set `viewCenter` w.r.t. the canvas.

<a name="camera.reset" href="#camera.reset">#</a> camera.<b>reset</b>()

Reset the camera to the initial `target`, `distance`, and `rotation`.

## v1.0.2

- Fix incorrect default parameters for `viewCenter` and `scaleBounds`

## v1.0.1

- Add `scaleBounds` option to the constructor for limiting the scale extent

## v1.0.0

**Important**

- Rename this package from `canvas-camera-2d` to `dom-2d-camera`

- Add `isNdc` option, which is set to `true` by default. If set to `false` the
  camera is working in pixel coordinates
- Add `viewCenter` option to the constructor for working in pixel coordinates
- Add the following options for event handlers to be fired after the camera has updated:
  - `onKeyDown`
  - `onKeyUp`
  - `onMouseDown`
  - `onMouseUp`
  - `onMouseMove`
  - `onWheel`
- Decrease dependencies on 3rd-party packages

## v0.5.5

- Update _camera-2d_ to `v2.0`

## v0.5.4

- Replace `key-pressed` with `is-key-down`

## v0.5.3

- Fix regression regarding `config()`

## v0.5.2

- Remove `camera.getGlPos()` as the base application should handle this since it typically involves a projection + model transformation

## v0.5.1

- Adjust mouse coordinates by aspect ration to support typical projection view model setups.

## v0.5.0

- Update camera-2d-simple to `v2` and adjust code
- Allow setting the rotation on create

## v0.4.0

- Add rotation by ALT + mouse dragging
- Remove zoom by ALT + mouse dragging

## v0.3.0

- **[Breaking change]** the camera must now be configured using `camera.config({ ... })`.
- Change to prettier code style.

## v0.2.0

- Allow fixing the camera position when `camera.isFixed === true`.

## v0.1.0

- First working version with pan and zoom. Note that rotation doesn't work yet.

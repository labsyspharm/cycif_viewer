**v2.2.1**

- Fix incorrectly reported `camera.rotation`

**v2.2.0**

- Add `scaleBounds` to allow limiting the scaling

**v2.1.0**

- Add support for a custom view center to allow using the camera with non normalized-device coordinates. For that I added `initViewCenter` as the forth argument to the constructor and`.setViewCenter()` for adjusting the view center.
- Rename `.set()` to `setView()` and deprecate `.set()`
- Ensure that `target` is a tuple to avoid confusion

**v2.0.1**

- Micro change in how glMatrix is imported

**v2.0.0**

- Add tests
- Add `camera.translate()` and `camera.scale()` as synonyms for `camera.pan()` and `camera.zoom()`
- Add `camera.set(view)` to directly set specific view matrix
- Fixed rotation
- Cleaned up code
- Changed `camera.view()` to `camera.view`
- Removed `camera.position` and `camera.transformation` as both are unnecessary.
- Update to glMatrix v3
- Release as ESM

**v1.2.0**

- Rotate around the viewport center
- Switch to [prettier](https://github.com/prettier/prettier)

**v1.1.0**

- Add `camera.rotate()` for rotations along the z axis.
- Add `camera.reset()` to reset the view to its original target, distance, and rotation.

**v1.0.0**

- Initial stable version

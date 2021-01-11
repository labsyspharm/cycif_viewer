## v0.25.0

- Add and test `nthIndexOf()`

## v0.24.1

- Make sure that `sum()` ignores `Number.NaN` values.
- Speed up `meanNan()`

## v0.24.0

- Add and test `meanNan()`, which ignores `Number.NaN` values

## v0.23.2

- Make sure that `min()` and `max()` ignore `Number.NaN` values

## v0.23.1

- Fix bad bug in and test `update()`

## v0.23.0

- Add and test `decToRgb()`

## v0.22.1

- Fix and test `withConstructor()`

## v0.22.0

- Add `median` and `medianVector` to _vector_

## v0.21.0

- Add `lRectDist` to _geometry_

## v0.20.0

- Add `isArray` and `isObject` to _type-checking_

## v0.19.0

- Add `diff()`, `l1DistByDim`, `l2DistByDim` to _vector_
- Add `dim` parameter to `lDist` to work like `l1DistByDim` and `l2DistByDim`
- Improve `isClose()`

## v0.18.0

- Add `aggregate()` to _array_

## v0.17.0

- Add `unique()` to _array_

## v0.16.1

- Allow sorting objects with `sortPos()`

## v0.16.0

- Add `randomString()` to _string_
- Add `removeLastChild()` to _dom_

## v0.15.0

- Add `withForwardedMethod()` to _fuctional-programming_

## v0.14.1

- Drammatically improve performance of `maxVector(m)`, `meanVector(m)`, `minVector(m)`, and `sumVector(m)` in the case when `m.length === 1`

## v0.14.0

- Add `maxVector()`, `minVector()`, `sumVector()` to _vector_

## v0.13.0

- Rename `matrixMeanCol()` to `meanVector()` and remove `matrixMeanRow()`

## v0.12.0

- Add `linear()`, `quadIn()`, `quadOut()`, `quadInOut()`, `cubicIn()`, `cubicOut()`, `quartIn()`, `quartOut()`, `quartInOut()`, `quintIn()`, `quintOut()`, and `quintInOut()` from to _animation_. Huge shoutout to https://gist.github.com/gre/1650294
- Add `isClose()` to _math_

## v0.11.0

- Add tested `matrixMeanCol()` and `matrixMeanRow()` to _matrix_
- Add customizable getter to `sortPos()` and `argSort()`

## v0.10.0

- Add `hexToRgbArray`, `hexToRgbaArray`, `rgbStrToRgbArray`, `rgbaStrToRgbaArray`, `rgbStrToDec`, `rgbToHex`, and `toRgbaArray` to _color_
- Add `isHex()`, `isNormFloat()`, `isNormFloatArray()`, `isRgbArray()`, `isRgbaArray()`, `isRgbStr()`, `isRgbaStr()`, `isString()`, `isUint8()`, and `isUint8Array` to _type-checking_
- Add tests for `deepClone()`
- Rename `hexStrToDec()` to `hexToDec()`
- Fix `deepClone()` to properly clone getter/setter instead of just cloning the value

## v0.9.0

- Add `createHtmlByTemplate(template)` to _dom_

## v0.8.0

- Add `removeAllChildren(node)` to _dom_

## v0.7.1

- Expose _array_ utils

## v0.7.0

- Add `array2dTranspose()` to _array_

## v0.6.0

- Add `nextAnimationFrame()` to _timing_

## v0.5.0

- Rename `withReadOnlyProperty()` to `withStaticProperty()`
- Add non-static version of `withReadOnlyProperty()`

## v0.4.0

- Rename `dist()` to `l2PointDist()`
- Add `lPointDist()` and `l1PointDist()`
- Add tests for point and vector distance functions

## v0.3.0

- Change the signature of `interpulateNumber` and `interpulateNumber` from `*(a, b)(p)` to `*(a, b, p)`
- Add tests for animation utils

## v0.2.1

- Fix npm release

## v0.2.0

- Add many new utility functions
- Add `animation` topic
- Add `color` topic
- Add `dom` topic
- Add `event` topic
- Add `object` topic
- Add `vector` topic
- Rename topic `numerics` to `math`

## v0.1.0

- Initial release

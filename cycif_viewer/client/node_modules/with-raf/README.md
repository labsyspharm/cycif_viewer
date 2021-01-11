# Higher Order Function for `requestAnimationFrame` Throttling

[![Build Status](https://img.shields.io/travis/flekschas/with-raf/master.svg?colorB=ff2b00)](https://travis-ci.org/flekschas/with-raf)

> A simple higher order function to throttle a function by animation frames.

## Install

```
npm -i -D with-raf
```

## API

#### `withRaf(fn, onCall, raf = window.requestAnimationFrame)`

- `fn` is a function to be [throttled](https://stackoverflow.com/a/25991510/981933)
- `onCall` is a callback function that is trigger once `fn` is called. It receives the return value of `fn` as its arguments.
- `raf` is an option to use a [polyfill for `window.requestAnimationFrame`](https://gist.github.com/paulirish/1579671)

**Returns:** the animation frame-throttled version of `fn`.

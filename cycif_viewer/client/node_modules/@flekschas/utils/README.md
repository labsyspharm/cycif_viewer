# A collection of handy utility functions

[![NPM Version](https://img.shields.io/npm/v/@flekschas/utils.svg?style=flat-square&color=7f99ff)](https://npmjs.org/package/@flekschas/utils)
[![Build Status](https://img.shields.io/travis/flekschas/utils?color=a17fff&style=flat-square)](https://travis-ci.org/flekschas/utils/)
[![File Size](http://img.badgesize.io/https://unpkg.com/@flekschas/utils/utils.min.js?compression=gzip&style=flat-square&color=e17fff)](https://unpkg.com/@flekschas/utils/utils.min.js)
[![Code Style Prettier](https://img.shields.io/badge/code%20style-prettier-ff7fe1.svg?style=flat-square)](https://github.com/prettier/prettier#readme)

This is a collection of utility functions that I keep using across different
projects. I primarily created this package for myself so I don't have to
re-implement over and over again and have a central place for testing them.

## Install

```bash
npm install @flekschas/utils --save-dev
```

## Usage

```javascript
import { debounce } from '@flekschas/utils';

const hi = debounce(() => {
  console.log('I am debounced');
}, 250);
```

For cherry picking from a specific topic do:

```javascript
import { debounce } from '@flekschas/utils/timing';
```

The utility functions are organized by the following topics:

- animation
- color
- conversion
- dom
- event
- functional-programming
- geometry
- map
- math
- object
- other
- sorting
- string
- timing
- type-checking
- vector

## Why

The three core goals of this collection are:

1. Reusability
2. Performance
3. Simplicity

Whenever a function is _reusable in a general context_ I might add it. When I
add a function I will make sure it's _performant_. Finally, every function
should be implement as _simple as possible_ without harming performance.
There's always a trade-off between performance and simplicity and my philosophy
is the following: if the simple and complex implementation perform roughly the
same, I choose the simple implementation. If a slightly more complex
implementation is much faster I will favor the complex implementation. In any
case, the API should always be simple and easy to understand!

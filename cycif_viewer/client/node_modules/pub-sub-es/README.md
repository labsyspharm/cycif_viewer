# Simple ES6-based pub-sub service

[![npm version](https://img.shields.io/npm/v/pub-sub-es.svg)](https://www.npmjs.com/package/pub-sub-es)
[![stability experimental](https://img.shields.io/badge/stability-stable-green.svg)](https://nodejs.org/api/documentation.html#documentation_stability_index)
[![build status](https://travis-ci.org/flekschas/pub-sub.svg?branch=master)](https://travis-ci.org/flekschas/pub-sub)
[![gzipped size](https://img.shields.io/bundlephobia/minzip/pub-sub-es?color=6ae3c7&label=gzipped%20size)](https://unpkg.com/pub-sub-es)
[![code style prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![demo](https://img.shields.io/badge/demo-online-c15de2.svg)](http://pub-sub.lekschas.de)

> A simple 0.8KB [pub-sub](https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern)-based event library that lets you send custom message within and cross the window! It's written in ES6 and makes use of the awesome [Broadcast Channel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API).

**Demo:** [pub-sub.lekschas.de](http://pub-sub.lekschas.de)

## Install

```
npm -i -D pub-sub-es
```

## Get Started

```javascript
import createPubSub from 'pub-sub-es';

// Creates a new pub-sub event listener stack.
const pubSub = createPubSub();

// Subscribe to an event
const myEmojiEventHandler = msg => console.log(`🎉 ${msg} 😍`);
pubSub.on('my-emoji-event', myEmojiEventHandler);

// Publish an event
pubSub.publish('my-emoji-event', 'Yuuhuu');  // >> 🎉 Yuuhuu 😍

// Unsubscribe
pubSub.unsubscribe('my-emoji-event', myEmojiEventHandler);
```

## API

`pub-sub-es` exports the factory function (`createPubSub`) for creating a new pub-sub service by default and a global pub-sub service (`globalPubSub`). The API is the same for both.

#### `createPubSub(stack = { __times__: {} })`

> Creates a new pub-sub instances

- `stack` is an object holding for holding the event listeners and defaults to a new stack when being omitted.

**Returns:** a new pub-sub service

#### `pubSub.publish(event, news)`

> Publishes or broadcasts an event with some news or payload

- `event` is the name of the event to be published.
- `news` is an arbitrary value that is being broadcasted.

#### `pubSub.subscribe(event, handler, times)`

> Subscribes a handler to a specific event

- `event` is the name of the event to be published.
- `handler` is the handler function that is being called together with the broadcasted value.
- `times` is the number of times the handler is invoked before it's automatically unsubscribed.

**Returns:** an object of form `{ event, handler }`. This object can be used to automatically unsubscribe, e.g., `pubSub.unsubscribe(pubSub.subscribe('my-event', myHandler))`.

#### `pubSub.unsubscribe(event)`

> Unsubscribes a handler from listening to an event

- `event` is the name of the event to be published. Optionally, `unsubscribe` accepts an object of form `{ event, handler}` coming from `subscribe`. 

#### `pubSub.clear()`

> Removes all currently active event listeners and unsets the event times.

_Note: this endpoint is not available on the global pub-sub because it could have undesired side effects. You need to unsubscribe global event listeners manually instead._

### Between-context messaging

The global pub-sub instance is created when `pub-sub-es.js` is loaded and provides a way for
global messaging within and between contexts. It utilizes the [Broadcast Channel API](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel), which is [currently not available in all browsers](https://caniuse.com/#feat=broadcastchannel). If you need to support more browsers you have to load a [polyfill](https://gist.github.com/alexis89x/041a8e20a9193f3c47fb). PubSubES is _not_ taking care of that! Also, when sending sending objects from one context to another you have to make sure that they are clonable. For example, trying to broadcast a reference to a DOM element will fail.

## Development

Some handy commands:

- `npm build`: builds the UMD library
- `npm run watch`: continuously builds the UMD library
- `npm run lint`: checks the code style
- `npm test`: runs the test suite

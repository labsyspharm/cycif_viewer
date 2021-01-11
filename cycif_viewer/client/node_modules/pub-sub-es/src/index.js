/**
 * A new or fake broadcast channel.
 * @type {BroadcastChannel|object}
 */
const bc = (() => {
  try {
    return new window.BroadcastChannel('pub-sub-es');
  } catch (e) {
    return { postMessage: () => {} };
  }
})();

/**
 * Get final event name
 * @param {string} eventName - Event name to be adjusted
 * @param {boolean} caseInsensitive - If `true`, `eventName` will be lowercased
 */
const getEventName = (eventName, caseInsensitive) =>
  caseInsensitive ? eventName.toLowerCase() : eventName;

/**
 * Setup subscriber.
 * @param {object} stack - The bound event stack.
 * @return {function} - Curried function for subscribing to an event on a
 *   specific event stack.
 */
const subscribe = (stack, { caseInsensitive } = {}) =>
  /**
   * Subscribe to an event.
   * @param {string} event - Event name to subscribe to.
   * @param {function} handler - Function to be called when event of type
   *   `event` is published.
   * @param {number} times - Number of times the handler should called for the
   *   given event. The event listener will automatically be unsubscribed once
   *   the number of calls exceeds `times`.
   * @return {object} Object with the event name and the handler. The object
   *   can be used to unsubscribe.
   */
  (event, handler, times = Infinity) => {
    const e = getEventName(event, caseInsensitive);

    if (!stack[e]) {
      stack[e] = [];
      stack.__times__[e] = [];
    }

    stack[e].push(handler);
    stack.__times__[e].push(+times || Infinity);

    return { event: e, handler };
  };

/**
 * Setup unsubscriber.
 * @param {object} stack - The bound event stack.
 * @return {function} - Curried function for unsubscribing an event from a
 *   specific event stack.
 */
const unsubscribe = (stack, { caseInsensitive } = {}) =>
  /**
   * Unsubscribe from event.
   * @curried
   * @param {string|object} event - Event from which to unsubscribe or the return
   *   object provided by `subscribe()`.
   * @param {function} handler - Handler function to be unsubscribed. It is
   *   ignored if `id` is provided.
   */
  (event, handler) => {
    if (typeof event === 'object') {
      handler = event.handler; // eslint-disable-line no-param-reassign
      event = event.event; // eslint-disable-line no-param-reassign
    }

    const e = getEventName(event, caseInsensitive);

    if (!stack[e]) return;

    const id = stack[e].indexOf(handler);

    if (id === -1 || id >= stack[e].length) return;

    stack[e].splice(id, 1);
    stack.__times__[e].splice(id, 1);
  };

/**
 * Inform listeners about some news
 * @param {array} listeners - List of listeners
 * @param {*} news - News object
 */
const inform = (listeners, news) => () => {
  listeners.forEach((listener) => listener(news));
};

/**
 * Setup the publisher.
 * @param  {object} stack - The bound event stack.
 * @param  {boolean} isGlobal - If `true` event will be published globally.
 * @return {function} - Curried function for publishing an event on a specific
 *   event stack.
 */
const publish = (stack, { isGlobal, caseInsensitive, async } = {}) => {
  const unsubscriber = unsubscribe(stack);

  /**
   * Public interface for publishing an event.
   * @curried
   * @param {string} event - Event type to be published.
   * @param {any} news - The news to be published.
   * @param {object} options - Option object with
   *   - {boolean} isNoGlobalBroadcast - If `true` event will *not* be
   *     broadcasted gloablly even if `isGlobal` is `true`.
   *   - {boolean} async - If `true` event will *not* be broadcasted
   *     synchronously even if `async` is `false` globally.
   */
  return (event, news, options = {}) => {
    const e = getEventName(event, caseInsensitive);

    if (!stack[e]) return;

    const listeners = [...stack[e]];

    listeners.forEach((listener, i) => {
      if (--stack.__times__[e][i] < 1) unsubscriber(e, listener);
    });

    if (async || options.async) {
      setTimeout(inform(listeners, news), 0);
    } else {
      inform(listeners, news)();
    }

    if (isGlobal && !options.isNoGlobalBroadcast) {
      try {
        bc.postMessage({ event: e, news });
      } catch (error) {
        if (error instanceof DOMException) {
          console.warn(
            `Could not broadcast '${e}' globally. Payload is not clonable.`
          );
        } else {
          throw error;
        }
      }
    }
  };
};

/**
 * Setup event clearer
 * @param {object} stack - The bound event stack.
 * @return {function} - A curried function removing all event listeners on a
 *   specific event stack.
 */
const clear = (stack) =>
  /**
   * Remove all event listeners and unset listening times
   * @curried
   */
  () => {
    Object.keys(stack)
      .filter((eventName) => eventName[0] !== '_')
      .forEach((eventName) => {
        stack[eventName] = undefined;
        stack.__times__[eventName] = undefined;
        delete stack[eventName];
        delete stack.__times__[eventName];
      });
  };

/**
 * Create a new empty stack object
 * @return {object} - An empty stack object.
 */
const createEmptyStack = () => ({ __times__: {} });

/**
 * Create a new pub-sub instance
 * @param {object} stack - Object to be used as the event stack.
 * @return {object} - A new pub-sub instance.
 */
const createPubSub = ({
  async = false,
  caseInsensitive = false,
  stack = createEmptyStack(),
} = {}) => {
  if (!stack.__times__) stack.__times__ = {};

  return {
    publish: publish(stack, { async, caseInsensitive }),
    subscribe: subscribe(stack, { caseInsensitive }),
    unsubscribe: unsubscribe(stack, { caseInsensitive }),
    clear: clear(stack),
    stack,
  };
};

/**
 * Global pub-sub stack object
 * @type {object}
 */
const globalPubSubStack = createEmptyStack();
/**
 * Global pub-sub stack instance
 * @type {object}
 */
const globalPubSub = {
  publish: publish(globalPubSubStack, { isGlobal: true }),
  subscribe: subscribe(globalPubSubStack),
  unsubscribe: unsubscribe(globalPubSubStack),
  stack: globalPubSubStack,
};
bc.onmessage = ({ data: { event, news } }) =>
  globalPubSub.publish(event, news, true);

export { globalPubSub, createPubSub };

export default createPubSub;

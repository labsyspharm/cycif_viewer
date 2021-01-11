/**
 * Higher order function for request animation frame-based throttling. If you
 * call the wrapped function multiple times, the last argument will be used the
 * next time a frame is available.
 * @param {function} fn - Function to be throttled
 * @param {function} onCall - Callback function, which is triggered with the
 *   return value of `fn`.
 * @param {function} raf - Request animation frame polyfill. Defaults to
 *   `window.requestAnimationFrame`.
 * @return {function} Throttled function `fn` which returns the request ID that
 *   can be used to cancel the request.
 */
const withRaf = (fn, onCall, raf = window.requestAnimationFrame) => {
  let isRequesting = false;
  let requestedArgs;
  return (...args) => {
    requestedArgs = args;
    if (isRequesting) return undefined;
    isRequesting = true;
    return raf(() => {
      const response = fn(...requestedArgs);
      isRequesting = false;
      if (onCall) onCall(response);
    });
  };
};

export default withRaf;

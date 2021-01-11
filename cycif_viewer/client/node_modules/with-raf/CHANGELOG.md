## v1.1.1

- Switched the execution order of unsetting `isRequesting` and triggering `onCall` to be able to easily create an animation-frame loop using `withRaf`.

## v1.1.0

- Fixed a bug that prevented continuous requests from accumulating
- Use the last argument instead of the first when calling the throttled function

## v1.0.0

- Initial version

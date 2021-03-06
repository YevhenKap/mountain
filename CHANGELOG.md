# [1.0.0-alpha.3] - 2021-05-23

### Removed

- Ability to pass `URL` as first parameter to `client.request` method.

## [1.0.0-alpha.2] - 2021-05-21

### Added

- `url` parameter to object that is returned by `accessRequest` function.
- `patch` function.

### Changed

- `path` parameter of `client.request` method can also be type of `URL` now.

### Removed

- `path` parameter from object that is returned by `accessRequest` function.

## [1.0.0-alpha.1] - 2021-05-16

Completely rewrite package with TypeScript with absolutely new API.

### Added

- `cookies` object for parsing and creating cookies.
- `responseFor` function for creating `Response` object.
- `accessRequest` function for getting basic information about request.
- `accessResponse` function for getting basic information about response that client receives.
- `files` controller for managing static assets.
- _route_ concept and ability to group routes by path.

### Changed

- server creation is done by `server` function.
- client creation is done by `client` function.

### Removed

- `Router` class.

## 0.4.0

- Rename `Router.set` method to `Router.deliver`.
- Rewrite internal behavior of `Router`.

## 0.3.0

- Remove `setTimeout` method from `Server` instance. Use `timeout` parameter in `Server`'s constructor.
- Add **parallel** and **threads** parameters to `Server`'s constructor.
- Refactor `Server` class to work in cluster mode.
- Make `onResponse`, `onData` and `onEnd` callbacks of `Client.request` method optional.

## 0.2.0

- Remove `rootDir` parameter from `Server` constructor.
- Remove `Route` class - it is now plain object that was passed to `Route` constructor.
- Rename `Handler` to `Router`.
- Temporary rid of _push_ ability of `HTTP/2` server.
- Fix error when file was not found on server. It caused closing connection before.
- Library now export `Client`.

## 0.1.5

- Minify distribution code.
- Make small internal changes that do not touch API.

## 0.1.4

- Merge parameters of `Server` constructor.
- Correct types.
- Add **gulp** build system.

## 0.1.3

- Write README.

## 0.1.2

- Write `Router` and `Route`.

## 0.1.1

- Add LICENSE.

## 0.1.0

- Creates main classes.

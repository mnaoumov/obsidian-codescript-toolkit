# requireAsyncWrapper

Some things simply cannot be loaded synchronously — [WebAssembly](<./15 WebAssembly.md>), [URLs](<./26 URLs.md>), [top-level await](<./29 Top-level await.md>), and most features at all on mobile. But plenty of code you did not write is full of synchronous `require()` calls. `requireAsyncWrapper()` bridges the two: it pre-loads everything asynchronously, then hands your callback a `require` that can resolve it synchronously.

```code-button
---
caption: requireAsyncWrapper
---
await requireAsyncWrapper((require) => {
  // WASM is not available for synchronous `require()` normally; `requireAsyncWrapper` pre-loads it so
  // the synchronous-style `require()` below works. `cacheInvalidationMode: 'never'` returns the
  // pre-loaded module from cache instead of trying to re-validate it (which cannot be done synchronously).
  const { answer } = require('/module.wasm', { cacheInvalidationMode: 'never' });
  const message = `requireAsyncWrapper: ${answer()}`;
  new (require('obsidian').Notice)(message);
  console.log(message);
});
```

## Options

The callback may itself be `async`, so you can mix awaited work with the synchronous requires:

```js
await requireAsyncWrapper(async (require) => {
  require(anyFeature);
  await someAsyncFn();
});
```

## Caveats

> [!WARNING]
>
> Watch variable scope. Anything declared inside the callback stays inside it:
>
> ```js
> await requireAsyncWrapper(async (require) => {
>   const foo = require('/foo.js');
> });
>
> foo.bar(); // ReferenceError — `foo` does not exist out here
> ```
>
> Declare it outside and assign within:
>
> ```js
> let foo;
>
> await requireAsyncWrapper(async (require) => {
>   foo = require('/foo.js');
> });
>
> foo.bar();
> ```

This is one of two ways to make desktop-only examples work on mobile; see [Migrate to async](<./01 Core functions.md#migrate-to-async>) for the other, and for when to prefer each.

## Platform support

| Desktop | Mobile |
| ------- | ------ |
| ✅      | ✅     |

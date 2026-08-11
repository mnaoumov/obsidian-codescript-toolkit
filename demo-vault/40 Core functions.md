# Core functions

Everything in this vault is built on three functions the plugin adds to the global scope: `require()`, `requireAsync()` and `requireAsyncWrapper()`. Knowing which to reach for is most of what there is to learn — it decides whether your script also runs on mobile.

```code-button
---
caption: All three, side by side
---
// synchronous — simplest, most limited
const { relativePath } = require('./_assets/CodeScriptToolkit/relativePath.js');
relativePath();

// asynchronous — everything works, needs `await`
const { rootRelativePath } = await requireAsync('/rootRelativePath.js');
rootRelativePath();

// synchronous-looking, asynchronously pre-loaded
await requireAsyncWrapper((require) => {
  const { vaultRootRelativePath } = require('//_assets/CodeScriptToolkit/vaultRootRelativePath.js');
  vaultRootRelativePath();
});
```

## `require()`

Obsidian on desktop has a built-in `require()`, but a limited one; on mobile it does not exist at all. This brings the advanced version to both.

Its single-argument form can equally be written as an `import`:

```js
// cjs
const foo = require('foo');
const { bar, baz } = require('qux');

// esm
import foo from 'foo';
import { bar, baz } from 'qux';
```

The `import` spelling works almost everywhere, except in:

- [`DevTools Console`](https://developer.chrome.com/docs/devtools/console) within Obsidian;
- [`CustomJS`](https://github.com/saml-dev/obsidian-custom-js) scripts;
- [`datacorejs` / `datacorejsx` / `datacorets` / `datacoretsx`](https://blacksmithgu.github.io/datacore/code-views) scripts;
- [`dataviewjs`](https://blacksmithgu.github.io/obsidian-dataview/api/intro/) scripts;
- [`QuickAdd`](https://quickadd.obsidian.guide/) scripts;
- [`Templater`](https://silentvoid13.github.io/Templater/) scripts.

## `requireAsync()`

Combines everything `require()` can do with everything dynamic [`import()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) can do. **Every** feature in this vault is available to it, on both platforms — which is why the platform tables in each note show far more ✅ in its row.

## `requireAsyncWrapper()`

Wraps synchronous `require()` calls in an asynchronous one, so code written in the synchronous style can still use features that only work asynchronously. See [requireAsyncWrapper](<./32 requireAsyncWrapper.md>) for a runnable example and the scope pitfall.

```js
await requireAsyncWrapper((require) => {
  require(anyFeature);
});
```

or

```js
await requireAsyncWrapper(async (require) => {
  require(anyFeature);
  await someAsyncFn();
});
```

## Performance tip

[Smart caching](<./30 Smart caching.md>) is on by default. For code that runs many times, disabling cache invalidation avoids the freshness check each time:

```js
require('/someScript.js', { cacheInvalidationMode: 'never' });
await requireAsync('/someScript.js', { cacheInvalidationMode: 'never' });
await requireAsyncWrapper((require) => {
  require('/someScript.js', { cacheInvalidationMode: 'never' });
});
```

For large prebuilt CommonJS bundles you can also [skip transpilation](<./25 Skip transpilation.md>) and avoid the Babel overhead entirely.

## Migrate-to-async

Most features do not work with `require()` on mobile, and a few do not work with it on desktop either. Every one of them works once the call is asynchronous — so "make it work on mobile" almost always means "migrate to async".

To migrate these calls:

```js
const foo = require('/foo.js');
const bar = require('/foo.js').bar;
const baz = require('/foo.js').baz();
const foo2 = require('/foo.js', { cacheInvalidationMode: 'never' });
```

write:

```js
const foo = await requireAsync('/foo.js');
const bar = (await requireAsync('/foo.js')).bar;
const baz = (await requireAsync('/foo.js')).baz();
const foo2 = await requireAsync('/foo.js', { cacheInvalidationMode: 'never' });
```

> [!WARNING]
>
> Mind the parentheses. It is a common mistake to omit them:
>
> ```js
> const bar = await requireAsync('/foo.js').bar;
> ```
>
> which means:
>
> ```js
> const bar = await (requireAsync('/foo.js').bar);
> ```
>
> `requireAsync('/foo.js')` returns a `Promise`, so `.bar` on it is `undefined` — and `bar` is silently assigned `undefined` instead of the module's `bar`.

Or wrap the whole block instead, leaving the calls untouched:

```js
await requireAsyncWrapper((require) => {
  const foo = require('/foo.js');
  const bar = require('/foo.js').bar;
  const baz = require('/foo.js').baz();
  const foo2 = require('/foo.js', { cacheInvalidationMode: 'never' });
});
```

or

```js
await requireAsyncWrapper(async (require) => {
  const foo = require('/foo.js');
  const bar = require('/foo.js').bar;
  const baz = require('/foo.js').baz();
  const foo2 = require('/foo.js', { cacheInvalidationMode: 'never' });
  await someAsyncFn();
});
```

> [!WARNING]
>
> When wrapping, mind variable scope. This is wrong — `foo` only exists inside the callback:
>
> ```js
> await requireAsyncWrapper(async (require) => {
>   const foo = require('/foo.js');
> });
>
> foo.bar();
> ```
>
> This is right:
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

## Platform support

| Function                | Desktop | Mobile |
| ----------------------- | ------- | ------ |
| `require()`             | ✅      | ✅*    |
| `requireAsync()`        | ✅      | ✅     |
| `requireAsyncWrapper()` | ✅      | ✅     |

\* The function exists on mobile, but most of the features listed in the other notes do not work through it — see each note's own table.

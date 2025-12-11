# Core functions

The plugin adds (or extends existing) the following functions to the global scope:

- `require()`
- `requireAsync()`
- `requireAsyncWrapper()`

Their [TypeScript definitions](../src/types.ts).

Explanation of their function arguments will be shown in the [Features](./usage.md#features) section.

## `require()`

[`Obsidian`][Obsidian] on Desktop has a built-in [`require()`][require] function, but it is quite limited.

[`Obsidian`][Obsidian] on Mobile does not have it at all.

This plugin brings the advanced version of [`require()`][require] to both Desktop and Mobile.

### [`esm`](https://nodejs.org/api/esm.html) import format

Single-argument `require()` version

```ts
export declare function require(id: string): unknown;
```

can be written in `esm` import format.

```js
// cjs
const foo = require('foo');
const { bar, baz } = require('qux');

// esm
import foo from 'foo';
import { bar, baz } from 'qux';
```

`esm` import format can be used in almost every context, except:

- [`DevTools Console`](https://developer.chrome.com/docs/devtools/console) within [`Obsidian`][Obsidian];
- [`CustomJS`](https://github.com/saml-dev/obsidian-custom-js) scripts;
- [`datacorejs` / `datacorejsx` / `datacorets` / `datacoretsx`](https://blacksmithgu.github.io/datacore/code-views) scripts;
- [`dataviewjs`](https://blacksmithgu.github.io/obsidian-dataview/api/intro/) scripts;
- [`QuickAdd`](https://quickadd.obsidian.guide/) scripts;
- [`Templater`](https://silentvoid13.github.io/Templater/) scripts;

## `requireAsync()`

Combines all features of [`require()`][require] and dynamic [`import()`][import].

All features brought by this plugin are available for it.

## `requireAsyncWrapper()`

Wraps synchronous [`require()`](#require) calls in asynchronous ones.

It is useful when you want to use the synchronous [`require()`](#require) calls but some features are not available for it normally.

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

The plugin is using [Smart caching](./smart-caching.md) feature, but if you have a code that is executed many times, you can try to speed it up via disabling cache invalidation. See the previous link to understand if it fits your needs.

```js
require('/someScript.js', { cacheInvalidationMode: 'never' });
await requireAsync('/someScript.js', { cacheInvalidationMode: 'never' });
await requireAsyncWrapper((require) => {
  require('/someScript.js', { cacheInvalidationMode: 'never' });
});
```

## Migrate to async

As you can see in the [Features](./usage.md#features) section, most of the features of [`require()`](#require) don't work on Mobile. And some features of [`require()`](#require) don't work on Desktop as well.

However, those features still can be used via migrating [`require()`](#require) calls to [`requireAsync()`](#requireasync) or [`requireAsyncWrapper()`](#requireasyncwrapper).

E.g., to migrate the following [`require()`](#require) calls:

```js
const foo = require('/foo.js');
const bar = require('/foo.js').bar;
const baz = require('/foo.js').baz();
const foo2 = require('/foo.js', { cacheInvalidationMode: 'never' });
```

Corresponding [`requireAsync()`](#requireasync) calls would be:

```js
const foo = await requireAsync('/foo.js');
const bar = (await requireAsync('/foo.js')).bar;
const baz = (await requireAsync('/foo.js')).baz();
const foo2 = await requireAsync('/foo.js', { cacheInvalidationMode: 'never' });
```

> [!WARNING]
>
> It is important to use parenthesis with `await` carefully.
>
> It is a common mistake to omit the parenthesis:
>
> ```js
> const bar = await requireAsync('/foo.js').bar;
> ```
>
> Which is equivalent to
>
> ```js
> const bar = await (requireAsync('/foo.js').bar);
> ```
>
> Which is the most likely not what you wanted to express. `requireAsync('/foo.js')` returns `Promise<FooModule>`, and `requireAsync('/foo.js').bar` would be `promise.bar`, which is `undefined`.
>
> So `bar` will be assigned to `undefined`, while you were expecting `fooModule.bar`.

You can also just wrap all your [`require()`](#require) calls with [`requireAsyncWrapper()`](#requireasyncwrapper):

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
> When wrapping with [`requireAsyncWrapper()`](#requireasyncwrapper), you need to be careful with variable scope.
>
> E.g., the following usage is wrong, because variable `foo` is defined inside the function scope and not accessible outside.
>
> ```js
> await requireAsyncWrapper(async (require) => {
>   const foo = require('/foo.js');
> });
>
> foo.bar();
> ```
>
> However, the following modification is correct.
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

[import]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import
[Obsidian]: https://obsidian.md/
[require]: https://nodejs.org/api/modules.html#requireid

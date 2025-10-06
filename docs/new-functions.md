# New functions

The plugin adds the following functions to the global scope:

- `require()`
- `requireAsync()`
- `requireAsyncWrapper()`

Their [TypeScript definitions](../src/types.ts).

Explanation of their function arguments will be shown in the [Features](./usage.md#features) section.

## `require()`

[`Obsidian`][Obsidian] on desktop has a built-in [`require()`][require] function, but it is quite limited.

[`Obsidian`][Obsidian] on mobile does not have it at all.

This plugin brings the advanced version of [`require()`][require] to both desktop and mobile.

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

It is especially useful for migrating scripts you have for desktop to use on mobile, as you can see in the [Features](./usage.md#features) section, most of the features of [`require()`](#require) don't work on mobile.

[import]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import
[Obsidian]: https://obsidian.md/
[require]: https://nodejs.org/api/modules.html#requireid

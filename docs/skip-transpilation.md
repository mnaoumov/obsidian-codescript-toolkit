# Skip transpilation

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ✅     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

By default, every JavaScript/TypeScript module is passed through [`Babel`](https://babeljs.io/) before it is executed. This is required for `TypeScript` stripping, [`ECMAScript Modules` (`esm`)](./esm.md) conversion, [dynamic `import()`](./dynamic-import.md) rewriting, and [top-level await](./top-level-await.md) support.

For large, already-built `CommonJS` bundles (e.g. [`Eruda`](https://github.com/liriliri/eruda), [`Monaco Editor`](https://github.com/microsoft/monaco-editor), vendor SDKs), that transpilation is pure overhead — the file is already runnable JavaScript. On big files it can add several seconds of load time and emit warnings such as:

```text
[BABEL] Note: The code generator has deoptimised the styling of ... as it exceeds the max of 500KB.
```

The plugin can run such a module **as-is**, skipping `Babel` entirely.

## Automatic detection

You do not need to configure anything for the common case. A module is executed without transpilation automatically when it is unambiguously plain `CommonJS`:

- A `.cjs` file that contains no `esm` (`import`/`export`), [dynamic `import()`](./dynamic-import.md), or `import.meta` syntax.
- A `.js` file whose nearest [`package.json`](https://docs.npmjs.com/cli/configuring-npm/package-json) does **not** declare `"type": "module"` (Node's `CommonJS` semantics), and which likewise contains no `esm`/dynamic-`import`/`import.meta` syntax.

Everything else is transpiled — `.mjs`, `.ts`/`.cts`/`.mts`, `esm` files, files under a `"type": "module"` package, [URLs](./urls.md), and any `.js` file with no `package.json` nearby. The detection deliberately errs toward transpiling: a wrongly-transpiled module is only slower, whereas a wrongly-skipped `esm` module would break.

## `shouldTranspile` option

You can also control it explicitly with the `shouldTranspile` option:

```js
// Force the module to run as-is, without transpilation (the fast path for prebuilt bundles).
const eruda = await requireAsync('/vendor/eruda.cjs', { shouldTranspile: false });

// Force transpilation, overriding automatic detection.
const mod = await requireAsync('/some-module.js', { shouldTranspile: true });
```

| Value                 | Behavior                               |
| --------------------- | -------------------------------------- |
| `false`               | Never transpile. Run the module as-is. |
| `true`                | Always transpile through `Babel`.      |
| `undefined` (default) | Auto-detect, as described above.       |

## Caveats

A module that runs without transpilation is treated as already-runnable `CommonJS` and is executed **synchronously**, so it cannot use features that only the transpilation pipeline provides:

- [`ECMAScript Modules` (`esm`)](./esm.md) `import`/`export` syntax.
- `TypeScript` syntax.
- [Top-level await](./top-level-await.md).
- [Dynamic `import()`](./dynamic-import.md) rewriting to [`requireAsync()`][requireAsync].

If you pass `shouldTranspile: false` to a file that needs any of these, it will fail to load. Automatic detection never picks the raw path for such files; the risk only applies when you set `shouldTranspile: false` yourself.

[require]: ./core-functions.md#require
[requireAsync]: ./core-functions.md#requireasync

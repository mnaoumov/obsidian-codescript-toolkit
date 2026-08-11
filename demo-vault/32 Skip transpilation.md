# Skip transpilation

Every JavaScript/TypeScript module normally goes through [Babel](https://babeljs.io/) first — that is what strips TypeScript, converts [ES modules](<./10 ECMAScript modules.md>), rewrites [dynamic `import()`](<./33 Dynamic import.md>) and enables [top-level await](<./29 Top-level await.md>). For a large prebuilt CommonJS bundle that is pure overhead: the file is already runnable JavaScript, and transpiling it can add seconds and log warnings like `[BABEL] Note: The code generator has deoptimised the styling of ... as it exceeds the max of 500KB`. Such a module can run as-is.

The three buttons below load the same bundle and print how long each took.

> [!TIP] Bigger difference
>
> These buttons load the small bundled `module.cjs`, so the timings are close. To see a dramatic difference, point the requires below at a large prebuilt CommonJS bundle (e.g. the UMD build from [Eruda](https://github.com/liriliri/eruda)) — the larger the bundle, the more transpilation costs.

```code-button
---
caption: Load WITH transpilation (Babel)
---
const start = performance.now();
await requireAsync('/module.cjs', { cacheInvalidationMode: 'always', shouldTranspile: true });
console.log(`With transpilation:    ${Math.round(performance.now() - start)} ms`);
```

```code-button
---
caption: Load WITHOUT transpilation (raw)
---
const start = performance.now();
await requireAsync('/module.cjs', { cacheInvalidationMode: 'always', shouldTranspile: false });
console.log(`Without transpilation: ${Math.round(performance.now() - start)} ms`);
```

```code-button
---
caption: Load with default auto-detection
---
// A plain `.cjs` bundle is detected as CommonJS and runs raw automatically — no option needed.
const start = performance.now();
await requireAsync('/module.cjs', { cacheInvalidationMode: 'always' });
console.log(`Auto-detected:         ${Math.round(performance.now() - start)} ms`);
```

## Options

You usually need no option at all. A module runs raw automatically when it is unambiguously plain CommonJS:

- a `.cjs` file with no `import`/`export`, dynamic `import()`, or `import.meta` syntax;
- a `.js` file whose nearest [`package.json`](https://docs.npmjs.com/cli/configuring-npm/package-json) does **not** declare `"type": "module"`, and which likewise has none of that syntax.

Everything else is transpiled — `.mjs`, `.ts`/`.cts`/`.mts`, ES modules, files under a `"type": "module"` package, [URLs](<./26 URLs.md>), and any `.js` with no `package.json` nearby. Detection deliberately errs toward transpiling: a wrongly-transpiled module is merely slower, whereas a wrongly-skipped ES module would break.

`shouldTranspile` overrides the decision:

| Value                 | Behavior                               |
| --------------------- | -------------------------------------- |
| `false`               | Never transpile. Run the module as-is. |
| `true`                | Always transpile through `Babel`.      |
| `undefined` (default) | Auto-detect, as described above.       |

## Caveats

A module that runs without transpilation is treated as already-runnable CommonJS and executes **synchronously**, so it cannot use anything the transpilation pipeline provides:

- [ES module](<./10 ECMAScript modules.md>) `import`/`export` syntax;
- TypeScript syntax;
- [Top-level await](<./29 Top-level await.md>);
- [Dynamic `import()`](<./33 Dynamic import.md>) rewriting to [`requireAsync()`](<./02 Core functions.md#requireasync>).

Passing `shouldTranspile: false` to a file that needs any of these makes it fail to load. Auto-detection never chooses the raw path for such files — the risk only exists when you set the option yourself.

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ✅     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

[require]: <./02 Core functions.md#require>
[requireAsync]: <./02 Core functions.md#requireasync>

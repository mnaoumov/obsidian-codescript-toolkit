[Docs](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/skip-transpilation.md)

CodeScript Toolkit runs imported JS/TS through Babel by default. Large prebuilt CommonJS bundles don't need that — you can skip it with `shouldTranspile: false` (or just rely on auto-detection for plain `.cjs` files). The buttons below load the same bundle and print how long it took.

> [!NOTE] Setup
>
> Drop a prebuilt CommonJS bundle at `vendor/eruda.cjs` in the vault root (e.g. the UMD build from [Eruda](https://github.com/liriliri/eruda)). The larger the bundle, the bigger the difference.

```code-button
---
caption: Load WITH transpilation (Babel)
---
const start = performance.now();
await requireAsync('/vendor/eruda.cjs', { cacheInvalidationMode: 'always', shouldTranspile: true });
console.log(`With transpilation:    ${Math.round(performance.now() - start)} ms`);
```

```code-button
---
caption: Load WITHOUT transpilation (raw)
---
const start = performance.now();
await requireAsync('/vendor/eruda.cjs', { cacheInvalidationMode: 'always', shouldTranspile: false });
console.log(`Without transpilation: ${Math.round(performance.now() - start)} ms`);
```

```code-button
---
caption: Load with default auto-detection
---
// A plain `.cjs` bundle is detected as CommonJS and runs raw automatically — no option needed.
const start = performance.now();
await requireAsync('/vendor/eruda.cjs', { cacheInvalidationMode: 'always' });
console.log(`Auto-detected:         ${Math.round(performance.now() - start)} ms`);
```

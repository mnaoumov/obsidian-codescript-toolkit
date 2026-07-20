[Docs](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/skip-transpilation.md)

CodeScript Toolkit runs imported JS/TS through Babel by default. Large prebuilt CommonJS bundles don't need that — you can skip it with `shouldTranspile: false` (or just rely on auto-detection for plain `.cjs` files). The buttons below load the same bundle and print how long it took.

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

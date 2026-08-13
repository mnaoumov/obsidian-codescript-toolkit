# Dynamic import

`import()` as an expression — load a module only when a branch is actually taken, or with a path computed at runtime. Inside scripts and code buttons it is rewired to [`requireAsync()`](<../02 Core functions.md#requireasync>), so everything else in this vault works through it too: vault paths, wikilinks, URLs, WebAssembly.

```code-button
---
caption: Dynamic import
---
const { dynamicImport } = await import('/dynamicImport.js')
dynamicImport();
```

## Caveats

The rewiring cannot be applied everywhere. It is **fully in effect** in:

- external script files: `js`, `cjs`, `mjs`, `ts`, `cts`, `mts`, `md`;
- [code button](<../01 Code buttons.md>) blocks.

It keeps its **original, unextended** behavior in:

- [`DevTools Console`](https://developer.chrome.com/docs/devtools/console) within Obsidian;
- [`CustomJS`](https://github.com/saml-dev/obsidian-custom-js) scripts;
- [`datacorejs` / `datacorejsx` / `datacorets` / `datacoretsx`](https://blacksmithgu.github.io/datacore/code-views) scripts;
- [`dataviewjs`](https://blacksmithgu.github.io/obsidian-dataview/api/intro/) scripts;
- [`JS Engine`](https://www.moritzjung.dev/obsidian-js-engine-plugin-docs/) scripts;
- [`Modules`](https://github.com/polyipseity/obsidian-modules) scripts;
- [`QuickAdd`](https://quickadd.obsidian.guide/) scripts;
- [`Templater`](https://silentvoid13.github.io/Templater/) scripts.

In those contexts, call [`requireAsync()`](<../02 Core functions.md#requireasync>) directly — it is never restricted.

## Platform support

| Desktop | Mobile |
| ------- | ------ |
| ✅*     | ✅*    |

\* Extended only in the contexts listed above.

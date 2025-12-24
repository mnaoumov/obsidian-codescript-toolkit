# Dynamic [`import()`][import]

| Desktop | Mobile |
| ------- | ------ |
| ✅*     | ✅*    |

Dynamic [`import()`][import] was **partially** modified to be an alias to [`requireAsync()`][requireAsync]

However due to the technical limitations, it's not possible to extend dynamic [`import()`][import] in all contexts.

**It is fully extended in**:

- External script files: `js`, `cjs`, `mjs`, `ts`, `cts`, `mts`, `md`.
- [Code buttons](./code-buttons.md) blocks.

**It has original (not extended) behavior in**:

- [`DevTools Console`](https://developer.chrome.com/docs/devtools/console) within [`Obsidian`](https://obsidian.md/);
- [`CustomJS`](https://github.com/saml-dev/obsidian-custom-js) scripts;
- [`datacorejs` / `datacorejsx` / `datacorets` / `datacoretsx`](https://blacksmithgu.github.io/datacore/code-views) scripts;
- [`dataviewjs`](https://blacksmithgu.github.io/obsidian-dataview/api/intro/) scripts;
- [`JS Engine`](https://www.moritzjung.dev/obsidian-js-engine-plugin-docs/) scripts;
- [`Modules`](https://github.com/polyipseity/obsidian-modules) scripts;
- [`QuickAdd`](https://quickadd.obsidian.guide/) scripts;
- [`Templater`](https://silentvoid13.github.io/Templater/) scripts;

So if you need fully functional variant, use [`requireAsync()`][requireAsync] instead.

[import]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import
[requireAsync]: ./core-functions.md#requireasync

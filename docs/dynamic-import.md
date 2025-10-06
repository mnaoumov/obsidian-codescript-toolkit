# Dynamic [`import()`][import]

| Desktop | Mobile |
| ------- | ------ |
| ✅*      | ✅*     |

Dynamic [`import()`][import] was **partially** modified to be an alias to [`requireAsync()`][requireAsync]

However due to the technical limitations, it's not possible to extend dynamic [`import()`][import] in all contexts.

**It is fully extended in**:

- External script files: `js`, `cjs`, `mjs`, `ts`, `cts`, `mts`, `md`.
- [Code buttons](./code-buttons.md) blocks.

**It has original (not extended) behavior in**:

- [`DevTools Console`][DevTools Console] within [`Obsidian`][Obsidian];
- [`CustomJS`][CustomJS] scripts;
- [`datacorejs` / `datacorejsx` / `datacorets` / `datacoretsx`][datacorejs] scripts;
- [`dataviewjs`][dataviewjs] scripts;
- [`Modules`][Modules] scripts;
- [`QuickAdd`][QuickAdd] scripts;
- [`Templater`][Templater] scripts;

So if you need fully functional variant, use [`requireAsync()`][requireAsync] instead.

[CustomJS]: https://github.com/saml-dev/obsidian-custom-js
[datacorejs]: https://blacksmithgu.github.io/datacore/code-views
[dataviewjs]: https://blacksmithgu.github.io/obsidian-dataview/api/intro/
[DevTools Console]: https://developer.chrome.com/docs/devtools/console
[import]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import
[Modules]: https://github.com/polyipseity/obsidian-modules
[Obsidian]: https://obsidian.md/
[QuickAdd]: https://quickadd.obsidian.guide/
[requireAsync]: ./new-functions.md#requireasync
[Templater]: https://silentvoid13.github.io/Templater/

# [`dataviewjs`](https://blacksmithgu.github.io/obsidian-dataview/api/intro/) scripts

## Prerequisite

`Dataview` is not bundled with this demo vault. Install and enable it first:

```code-button
---
caption: Install and enable Dataview
---
await require('/demoSetup.ts').installConfigureEnable(app, 'dataview', { enableDataviewJs: true });
```

## Run `CodeScript Toolkit` from `Dataview`

```dataviewjs
const button = dv.el('button', 'Run CodeScript Toolkit from Dataview');
button.addEventListener('click', () => {
  const { runFromDataviewjs } = require('/integrateWithOtherPlugins.js');
  runFromDataviewjs();
});
```

> [!WARNING] Mobile support
>
> `require()` calls in `dataviewjs` on Mobile bypass `CodeScript Toolkit` plugin and most of its features will not work there.
>
> E.g., `require('/integrateWithOtherPlugins.js')` from the example above, will just return `undefined`, leading to the hard-to-detect errors.
>
> See [docs](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/core-functions.md#migrate-to-async) to adjust the code examples to work on Mobile.

## Run `Dataview` from `CodeScript Toolkit`

```code-button
---
caption: Run Dataview from CodeScript Toolkit
---
import { Notice } from 'obsidian';
const message = 'Run Dataview from CodeScript Toolkit. See page object in the console';
new Notice(message);
console.log(message);
const page = DataviewAPI.page(app.workspace.getActiveFile().path);
console.log(page);
```

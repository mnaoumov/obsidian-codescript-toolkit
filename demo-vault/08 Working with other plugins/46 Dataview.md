# [`dataviewjs`](https://blacksmithgu.github.io/obsidian-dataview/api/intro/) scripts

A `dataviewjs` block can `require()` your own modules, so query logic you keep repeating across notes can live in one `.ts` file instead. And a code button can call Dataview's API back, which is handy for inspecting what a query actually returns.

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
> See [Migrate to async](<../02 Core functions.md#migrate-to-async>) to adjust the code examples to work on Mobile.

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

## One view, many questions

Once a `dataviewjs` block can load your modules, the query itself no longer has to be written into the note: put it in the note's frontmatter and the block becomes a dispatcher that runs whichever module the frontmatter names.

See [Parameterized Dataview queries](<./47 Parameterized Dataview queries.md>) for the pattern, running.

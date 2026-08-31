# [`datacorejs` / `datacorejsx` / `datacorets` / `datacoretsx`](https://blacksmithgu.github.io/datacore/code-views) scripts

Datacore has four code-view flavours, JSX included. All of them can `require()` your vault modules, so the component you built for one view can be shared across all of them instead of copy-pasted.

## Prerequisite

`Datacore` is not bundled with this demo vault. Install and enable it first:

```code-button
---
caption: Install and enable Datacore
---
await require('/demoSetup.ts').installConfigureEnable(app, 'datacore');
```

## Run `CodeScript Toolkit` from `Datacore`

```datacorejs
return dc.preact.h(
  dc.Button,
  {
    onClick: () => {
      const { runFromDatacorejs } = require('/integrateWithOtherPlugins.js');
      runFromDatacorejs();
    }
   },
  'Run CodeScript Toolkit from datacorejs'
);
```

```datacorejsx
return <dc.Button onClick={() => {
  const { runFromDatacorejsx } = require('/integrateWithOtherPlugins.js');
  runFromDatacorejsx();
}}>Run CodeScript Toolkit from datacorejsx</dc.Button>
```

```datacorets
return dc.preact.h(
  dc.Button,
  {
    onClick: () => {
      const { runFromDatacorets } = require('/integrateWithOtherPlugins.js');
      runFromDatacorets();
    }
  },
  'Run CodeScript Toolkit from datacorets'
);
```

```datacoretsx
return <dc.Button onClick={() => {
  const { runFromDatacoretsx } = require('/integrateWithOtherPlugins.js');
  runFromDatacoretsx();
}}>Run CodeScript Toolkit from datacoretsx</dc.Button>
```

## Run `Datacore` from `CodeScript Toolkit`

```code-button
---
caption: Run Datacore from CodeScript Toolkit
---
import { Notice } from 'obsidian';
const message = 'Run Datacore from CodeScript Toolkit. See page object in the console';
new Notice(message);
console.log(message);
const page = datacore.page(app.workspace.getActiveFile().path);
console.log(page);
```

## `dc.require()` and `require()`

Datacore has a loader of its own: `dc.require(path)` reads a `.js`, `.ts`, `.jsx` or `.tsx` file from your vault, or a codeblock addressed by the section it sits in, and hands back what that code returns.

It is not a module system, though. What it loads is evaluated as a function body with only `dc` in scope, so the file has to **`return` its exports** — the `export` keyword does not work there — and nothing from npm, Node or the rest of [what this plugin can load](<../02 What you can load/README.md>) is in reach. `require()` and `requireAsync()` work inside a `dc.require()`d file just as they do in the blocks above, so the two compose: use Datacore's loader for the components it renders, and this plugin's for the modules underneath them.

[Parameterized Dataview queries](<./47 Parameterized Dataview queries.md>) builds a whole query layer out of that idea on the Dataview side.

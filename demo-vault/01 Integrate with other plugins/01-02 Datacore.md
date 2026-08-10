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

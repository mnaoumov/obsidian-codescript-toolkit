# [`Modules`](https://github.com/polyipseity/obsidian-modules) scripts

## Prerequisite

`Modules` is not bundled with this demo vault. Install and enable it first:

```code-button
---
caption: Install and enable Modules
---
await require('/demoSetup.ts').installAndEnable(app, 'modules');
```

## Run `CodeScript Toolkit` from `Modules`

See [[ModulesModule]]

## Run `Modules` from `CodeScript Toolkit`

```code-button
---
caption: Run Dataview from CodeScript Toolkit
---
const module = await self.require.import('_assets/Modules/ModulesModule.md');
module.runFromCodeScriptToolkit();
```

# [`Modules`](https://community.obsidian.md/plugins/modules) scripts

`Modules` is another module loader for Obsidian, and the two work together: a `Modules` module can `require()` through CodeScript Toolkit, and a code button can import a `Modules` module. Useful if you already have scripts written for it and do not want to port them.

## Prerequisite

`Modules` is not bundled with this demo vault. Install and enable it first:

```code-button
---
caption: Install and enable Modules
---
await require('/demoSetup.ts').installConfigureEnable(app, 'modules');
```

## Run `CodeScript Toolkit` from `Modules`

See [ModulesModule](<../_assets/Modules/ModulesModule.md>).

## Run `Modules` from `CodeScript Toolkit`

```code-button
---
caption: Run Modules from CodeScript Toolkit
---
const module = await self.require.import('_assets/Modules/ModulesModule.md');
module.runFromCodeScriptToolkit();
```

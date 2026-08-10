# [`CustomJS`](https://github.com/saml-dev/obsidian-custom-js) scripts

`CustomJS` keeps reusable code in classes that any note can call. Pair it with CodeScript Toolkit and those classes gain the full module system — TypeScript, ES modules, npm packages — while a code button can still invoke them.

## Prerequisite

`CustomJS` is not bundled with this demo vault. Install and enable it first:

```code-button
---
caption: Install and enable CustomJS
---
await require('/demoSetup.ts').installConfigureEnable(app, 'customjs', { jsFolder: '_assets/CustomJS' });
```

## Run `CodeScript Toolkit` from `CustomJS`

Invoke `CustomJS: RunCodeScriptToolkitFromCustomJS` command.

## Run `CustomJS` from `CodeScript Toolkit`

```code-button
---
caption: Run CustomJS from CodeScript Toolkit
---
customJS.CustomJSModule.runFromCodeScriptToolkit()
```

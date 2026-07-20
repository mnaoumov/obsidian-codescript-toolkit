# [`QuickAdd`](https://quickadd.obsidian.guide/) scripts

## Prerequisite

`QuickAdd` is not bundled with this demo vault. Install and enable it first:

```code-button
---
caption: Install and enable QuickAdd
---
await require('/demoSetup.ts').installConfigureEnable(app, 'quickadd');
```

## Run `CodeScript Toolkit` from `QuickAdd`

Invoke `QuickAdd: Run QuickAdd` → `RunCodeScriptToolkitFromQuickAdd` command.

## Run `QuickAdd` from `CodeScript Toolkit`

```code-button
---
caption: Run QuickAdd from CodeScript Toolkit
---
app.plugins.plugins.quickadd.api.executeChoice('QuickAddModule')
```

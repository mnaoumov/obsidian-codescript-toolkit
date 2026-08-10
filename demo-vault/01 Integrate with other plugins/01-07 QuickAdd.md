# [`QuickAdd`](https://quickadd.obsidian.guide/) scripts

`QuickAdd` runs scripts as part of capture and template choices. Those scripts get the full module system here, and a code button can trigger a QuickAdd choice — so a capture flow can be driven from a note.

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

# [`JS Engine`](https://www.moritzjung.dev/obsidian-js-engine-plugin-docs/) scripts

## Prerequisite

`JS Engine` is not bundled with this demo vault. Install and enable it first:

```code-button
---
caption: Install and enable JS Engine
---
await require('/demoSetup.ts').installConfigureEnable(app, 'js-engine');
```

## Run `CodeScript Toolkit` from `JS Engine`

```js-engine
const button = createEl('button', {
    text: 'Run CodeScript Toolkit from JS Engine'
});
button.addEventListener('click', () => {
  const { runFromJSEngine } = require('/integrateWithOtherPlugins.js');
  runFromJSEngine();
});
return button;
```

## Run `JS Engine` from `CodeScript Toolkit`

```code-button
---
caption: Run JS Engine from CodeScript Toolkit
---
app.plugins.plugins['js-engine'].api.prompt.yesNo({ title: 'Run JS Engine from CodeScript Toolkit' });
```

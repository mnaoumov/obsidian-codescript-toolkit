[Docs](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/code-script-toolkit.md)

## registerTempPlugin

```code-button
---
caption: 'registerTempPlugin from codescript-toolkit'
---
const { registerTempPlugin } = require('codescript-toolkit');
const { Plugin } = require('obsidian');

class RequireCodescriptToolkitModulePlugin extends Plugin {
  onload() {
    new Notice('registerTempPlugin from codescript-toolkit');
  }
}

const cssText = '* { color: red; }';

await registerTempPlugin({ tempPluginClass: RequireCodescriptToolkitModulePlugin, cssText });
```

## getTempPlugin

```code-button
---
caption: 'getTempPlugin from codescript-toolkit'
---
const { getTempPlugin } = require('codescript-toolkit');

const plugin = getTempPlugin('RequireCodescriptToolkitModulePlugin');
new Notice(`Temp plugin: ${plugin ? 'found' : 'not found'}`);
```

## unregisterTempPlugin

```code-button
---
caption: 'unregisterTempPlugin from codescript-toolkit'
---
const { unregisterTempPlugin } = require('codescript-toolkit');

unregisterTempPlugin('RequireCodescriptToolkitModulePlugin');
```

# `codescript-toolkit` module

This plugin's own API, requirable from any script. Its main job is temporary plugins: a class you write in a note gets loaded as a real Obsidian plugin — commands, ribbon icons, event handlers and all — and unloaded again without ever leaving Obsidian. That is the fastest way to prototype a plugin idea, or to add a command you only need for the next ten minutes.

The same functions are available inside a code button as [`codeButtonContext`](<./42 Code button context.md>); this module is how you reach them from a `.js`/`.ts` file instead.

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

`registerTempPlugin()` returns the loaded plugin instance, or `null` if loading failed. The optional `cssText` is loaded and unloaded together with the plugin.

## `getTempPlugin()`

Looks a registered temp plugin back up, by class or by class name — so a second button can talk to the plugin the first one registered.

```code-button
---
caption: 'getTempPlugin from codescript-toolkit'
---
const { getTempPlugin } = require('codescript-toolkit');

const plugin = getTempPlugin('RequireCodescriptToolkitModulePlugin');
new Notice(`Temp plugin: ${plugin ? 'found' : 'not found'}`);
```

## `unregisterTempPlugin()`

Unloads it again. Temp plugins are also unloaded automatically when CodeScript Toolkit itself unloads, so nothing survives a restart.

```code-button
---
caption: 'unregisterTempPlugin from codescript-toolkit'
---
const { unregisterTempPlugin } = require('codescript-toolkit');

unregisterTempPlugin('RequireCodescriptToolkitModulePlugin');
```

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ✅     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

[require]: <./01 Core functions.md#require>
[requireAsync]: <./01 Core functions.md#requireasync>

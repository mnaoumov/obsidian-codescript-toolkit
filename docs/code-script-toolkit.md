# `codescript-toolkit` module

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ✅     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

You can access [helper functions](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/src/code-script-toolkit-module.ts) of this plugin.

```js
const cst = require('codescript-toolkit');
```

## `registerTempPlugin()`

Registers a temporary plugin. Returns the loaded plugin instance, or `null` if loading failed.

```js
const plugin = await cst.registerTempPlugin({ tempPluginClass: MyPlugin });
const plugin = await cst.registerTempPlugin({ tempPluginClass: MyPlugin, cssText: '* { color: red; }' });
```

## `getTempPlugin()`

Retrieves a previously registered temp plugin by its class or class name.

```js
const plugin = cst.getTempPlugin(MyPlugin);
const plugin = cst.getTempPlugin('MyPlugin');
```

## `unregisterTempPlugin()`

Unregisters a temporary plugin by its class or class name.

```js
cst.unregisterTempPlugin(MyPlugin);
cst.unregisterTempPlugin('MyPlugin');
```

[require]: ./core-functions.md#require
[requireAsync]: ./core-functions.md#requireasync

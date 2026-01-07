# Code button context

During runtime execution of the code button block, the following variable is available `codeButtonContext`.

The variable contains all metadata and helper functions available during runtime execution.

See [spec](../src/CodeButtonContext.ts) for all possible values.

## `codeButtonContext.container`

Within code block you have access to the `codeButtonContext.container` HTML element that wraps the results panel.

````markdown
```code-button
codeButtonContext.container.createEl('button', { text: 'Click me!' });
```
````

## `codeButtonContext.registerTempPlugin()`

This plugin allows you to create temporary plugins.

This is useful for quick plugin prototyping from inside the [`Obsidian`][Obsidian] itself.

The key here is the function `codeButtonContext.registerTempPlugin()`, which is available in the script scope.

````markdown
```code-button
import { Plugin } from 'obsidian';

class MyPlugin extends Plugin {
  onload() {
    console.log('loading MyPlugin');
  }
}

codeButtonContext.registerTempPlugin(MyPlugin);
```
````

The loaded temp plugins can be unloaded using the `CodeScript Toolkit: Unload temp plugin: PluginName` / `CodeScript Toolkit: Unload temp plugins` commands.

Also all temp plugins are unloaded when current plugin is unloaded.

You can also add custom CSS that is loaded and unloaded together with temp plugin:

```js
codeButtonContext.registerTempPlugin(MyPlugin, '* { color: red; }');
```

## `codeButtonContext.renderMarkdown()`

Within code block you have access to the `codeButtonContext.renderMarkdown()` function that renders markdown in the results panel.

````markdown
```code-button
await codeButtonContext.renderMarkdown('**foo**');
```
````

## Functions to modify containing note file

Within code block you have access to the following functions that modify the containing note file:

````markdown
```code-button
await codeButtonContext.insertAfterCodeButtonBlock('**foo**');
await codeButtonContext.insertBeforeCodeButtonBlock('**bar**');
await codeButtonContext.removeCodeButtonBlock();
await codeButtonContext.replaceCodeButtonBlock(**baz**);
```
````

[Obsidian]: https://obsidian.md/

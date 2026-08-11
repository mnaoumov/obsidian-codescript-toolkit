# Code button context

While a [code button](<./01 Code buttons.md>) runs, a variable called `codeButtonContext` is in scope. It is the button's handle on itself and on Obsidian: where to draw, how to render markdown, how to edit the note the button lives in, and how to load a temporary plugin. This is what turns a code button from "runs a script" into "builds a small piece of UI inside a note".

## `codeButtonContext.container`

The element wrapping the results panel — yours to draw into. Build a form, a table, a set of buttons.

```code-button
---
caption: Container
---
codeButtonContext.container.createEl('button', { text: 'Container' });
```

## `codeButtonContext.renderMarkdown()`

Renders markdown into the results panel, with Obsidian's own renderer — so links, callouts, and embeds all behave.

```code-button
---
caption: renderMarkdown
---
codeButtonContext.renderMarkdown('**hello**');
```

## `codeButtonContext.registerTempPlugin()`

Loads a class you wrote in this note as a real Obsidian plugin: commands, ribbon icons, event handlers, settings. It is the shortest path from plugin idea to running plugin, without leaving Obsidian.

```code-button
---
caption: registerTempPlugin
---
import { Notice, Plugin } from 'obsidian';

class MyTempPlugin extends Plugin {
  public override onload(): void {
    this.addCommand({
      id: 'temp-command',
      name: 'Temp command',
      callback: () => {
        new Notice('Temp command');
        console.log('Temp command');
      }
    })
  }
}

const cssText = '* { color: red; }';

codeButtonContext.registerTempPlugin({ tempPluginClass: MyTempPlugin, cssText });

codeButtonContext.container.createEl('button', {
  text: 'Unregister'
}, (button) => {
  button.addEventListener('click', () => {
    app.commands.executeCommandById('fix-require-modules:unregister-temp-plugin-MyTempPlugin');
  });
});
```

It returns the loaded plugin instance, or `null` if loading failed. The optional `cssText` is loaded and unloaded with it. Temp plugins can be unloaded from the `Command Palette` (`CodeScript Toolkit: Unload temp plugin: …` / `Unload temp plugins`), and are all unloaded when CodeScript Toolkit itself unloads — nothing survives a restart.

## `codeButtonContext.getTempPlugin()`

Looks a registered temp plugin back up, by class or class name, so one button can talk to what another registered.

```code-button
---
caption: getTempPlugin
---
const tempPlugin = codeButtonContext.getTempPlugin('MyTempPlugin');
new Notice(`Temp plugin: ${tempPlugin ? 'found' : 'not found'}`);
```

## Editing the note the button lives in

Four functions let a button rewrite its own surroundings — which is how a button can record its result into the note, or replace itself with what it produced.

```code-button
---
caption: insertBeforeCodeButtonBlock
---
await codeButtonContext.insertBeforeCodeButtonBlock({ markdown: '**bar**' });
```

```code-button
---
caption: insertAfterCodeButtonBlock
---
await codeButtonContext.insertAfterCodeButtonBlock({ markdown: '**foo**' });
```

```code-button
---
caption: removeCodeButtonBlock
---
await codeButtonContext.removeCodeButtonBlock();
```

```code-button
---
caption: replaceCodeButtonBlock
---
await codeButtonContext.replaceCodeButtonBlock({ markdown: '**baz**' });
```

The same functions are available to plain scripts through the [`codescript-toolkit` module](<./22 codescript-toolkit.md>).

## Full spec

Every member, with its type, lives in [`src/code-button-context.ts`](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/src/code-button-context.ts).

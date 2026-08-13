# Code button config

Every [code button](<../01 Code buttons.md>) can be configured by a YAML block at the top of its source. That is how a button gets a caption, runs itself, cleans itself up afterwards, or shows you the code behind it. All keys are optional, and every key omitted falls back to its default.

Here is the full config, with the defaults it would have anyway:

````markdown
```code-button
---
caption: (no caption)
css: ""
cssClasses: ""
isRaw: false
removeAfterExecution:
  shouldKeepGap: false
  when: never
shouldAutoOutput: true
shouldAutoRun: false
shouldAutoScrollToConsoleMessages: true
shouldShowSystemMessages: true
shouldWrapConsole: true
sourceVisibility: hidden
---
// Code
```
````

Rather than typing that, run **CodeScript Toolkit: Insert sample code button** to drop a fresh block at the cursor.

## Override default button config

Repeating the same three keys on every button gets old. The plugin's settings tab has a **Default code button config** field taking the same YAML, applied to every button in the vault. Individual buttons still override it — which is exactly how this demo vault turns `sourceVisibility` on, and `shouldAutoScrollToConsoleMessages` off, everywhere without touching a single note.

## `caption` - Button text

What the button says. Without it, the button reads `(no caption)`.

## `css` - Inline button styles

Styles the button itself, before anyone clicks it — same syntax as an HTML `style` attribute. Useful for making one button in a note stand out, or toning a destructive one down.

````markdown
```code-button
---
caption: Click me
css: "color: red; margin-top: 10px"
---
new Notice('Clicked');
```
````

```code-button
---
caption: Click me
css: "color: red; margin-top: 10px"
---
import { Notice } from 'obsidian';
new Notice('Clicked');
```

## `cssClasses` - Button CSS classes

Adds your own CSS classes to the button, so a [CSS snippet](https://help.obsidian.md/snippets) can style every button of a kind at once instead of repeating `css` on each. Takes one space-separated string or a list.

````markdown
```code-button
---
caption: Click me
cssClasses: my-button my-other-button
---
new Notice('Clicked');
```
````

The list form reads better past a class or two:

````markdown
```code-button
---
caption: Click me
cssClasses:
  - my-button
  - my-other-button
---
new Notice('Clicked');
```
````

## `isRaw` - Raw mode

A raw button renders only what your code puts on the page — no button, no console output, no system messages.

````markdown
```code-button
---
isRaw: true
---
await codeButtonContext.renderMarkdown('**foo**');
```
````

It implies, and overrides, the following:

```yaml
---
isRaw: true
shouldAutoOutput: false
shouldAutoRun: true
shouldShowSystemMessages: false
shouldWrapConsole: false
---
```

## `removeAfterExecution` - Remove after execution mode

Deletes the block from the note once it has run — for scripts meant to be used once. `when` is `always`, `never`, `onSuccess` or `onError`; `shouldKeepGap` decides whether the blank line stays behind.

````markdown
```code-button
---
removeAfterExecution:
  shouldKeepGap: false
  when: never
---
// Code
```
````

## `shouldAutoOutput` - Auto output mode

Code blocks echo the last evaluated expression, the way a REPL such as [`DevTools Console`][DevTools Console] does.

````markdown
```code-button
---
shouldAutoOutput: true # default
---
1 + 2;
3 + 4;
5 + 6; // this will be displayed in the results panel
```
````

Set it to `false` to keep the panel to what you print explicitly.

````markdown
```code-button
---
shouldAutoOutput: false
---
1 + 2;
3 + 4;
5 + 6; // this will NOT be displayed in the results panel
```
````

## `shouldAutoRun` - Auto running code blocks mode

Runs the block as soon as the note is rendered in `Reading mode` / `Live Preview`, instead of waiting for a click.

````markdown
```code-button
---
shouldAutoRun: true
---
// Code
```
````

## `shouldAutoScrollToConsoleMessages` - Auto scrolling

As messages land in the results panel, the panel scrolls itself into view so the newest line stays visible. That is what you want after clicking a button, and what you do not want from a [`shouldAutoRun`](#shouldautorun---auto-running-code-blocks-mode) button: the note is still rendering, nobody clicked anything, and the page jumps down to a button you had not scrolled to yet.

Set it to `false` on any button that runs itself, and opening the note leaves you at the top.

````markdown
```code-button
---
caption: Button that runs itself quietly
shouldAutoRun: true
shouldAutoScrollToConsoleMessages: false
---
console.log('Ran on render, without dragging the note down here.');
```
````

It covers everything the panel shows — both the [system messages](#shouldshowsystemmessages---system-messages) and the [console messages](#shouldwrapconsole---console-messages). Turning either of those off removes its messages, and therefore its scrolling, on its own.

Like `sourceVisibility`, this is usually a per-vault decision rather than a per-button one, so it is best set once in **Default code button config** — as this demo vault does, from its [startup script](<../06 Running scripts without a button/39 Startup script.md>).

## `shouldShowSystemMessages` - System messages

Whether the *⏳ Executing…* / *✅ Executed successfully* banners appear in the results panel. Turn them off for a button whose own output is the point.

## `shouldWrapConsole` - Console messages

Code blocks intercept `console.debug()`, `console.error()`, `console.info()`, `console.log()` and `console.warn()`, and show them in the results panel instead of only in DevTools.

````markdown
```code-button
---
shouldWrapConsole: true # default
---
console.debug('debug message');
console.error('error message');
console.info('info message');
console.log('log message');
console.warn('warn message');
```
````

![Console messages](../_assets/attachments/console-messages.png)

Set it to `false` to leave `console` alone and send output back to DevTools.

````markdown
```code-button
---
shouldWrapConsole: false
---
// Code
```
````

## `sourceVisibility` - Source visibility

In Reading view a code button shows only a button — the code that makes it work is invisible, which is fine for a script you wrote and unhelpful for one you are trying to learn from. `sourceVisibility` adds a `</>` toggle beside the button that reveals the source, syntax-highlighted.

````markdown
```code-button
---
caption: Show me the code
sourceVisibility: collapsed
---
// Click the `</>` toggle beside the button to reveal this.
'hello';
```
````

```code-button
---
caption: Show me the code
sourceVisibility: collapsed
---
// Click the `</>` toggle beside the button to reveal this.
'hello';
```

| Value       | Behavior                             |
| ----------- | ------------------------------------ |
| `hidden`    | no toggle, no source panel (default) |
| `collapsed` | toggle shown, panel starts closed    |
| `expanded`  | toggle shown, panel starts open      |

Right-clicking a button offers **Copy source** and **Reveal in note**, whatever this is set to.

This is a per-vault decision more than a per-button one, so it is usually best set once in **Default code button config** — as this demo vault does.

## Caveats

`sourceVisibility` has no effect on `isRaw` buttons. A raw button owns its whole rendered element and clears it on every run, so there is nowhere for a panel to survive.

`css` and `cssClasses` have no effect on `isRaw` buttons either, for the simpler reason that a raw button renders no button element to style.

## Full spec

Every key, with its type, lives in [`src/code-button-block-config.ts`](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/src/code-button-block-config.ts).

[DevTools Console]: https://developer.chrome.com/docs/devtools/console

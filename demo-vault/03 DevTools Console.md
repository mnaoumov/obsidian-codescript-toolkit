# DevTools Console

A code button is not the only place your code can run. The plugin's `require()` is also available in Obsidian's own [`DevTools Console`](https://developer.chrome.com/docs/devtools/console), so you can pull a vault module in and poke at it interactively while you are still writing it. This is the fastest debugging loop the plugin offers, and it is worth knowing before you write anything longer than a button.

Open the console with `Ctrl/Command + Shift + I`.

Type `require('/relativePath.js').relativePath();` and press `Enter`. A notice appears, exactly as it would from a button — same module, same resolution rules, no note involved.

The leading `/` addresses the vault's scripts folder rather than the current note, which is what makes the call work from a console that has no note of its own. [02 Core functions](<./02 Core functions.md>) covers the path forms, and [05 Root-relative path](<./01 Where your code lives/05 Root-relative path.md>) covers this one in particular.

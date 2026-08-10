# [`DevTools Console`](https://developer.chrome.com/docs/devtools/console) within [`Obsidian`](https://obsidian.md/)

The console is a scripting surface too, and the plugin's `require()` is available there — so you can pull a vault module in and poke at it interactively while you are writing it. This is the fastest debugging loop the plugin offers.

Open `DevTools Console` via `Ctrl/Command + Shift + I`.

Type `require('/integrateWithOtherPlugins.js').runFromDevToolsConsole();` and press `Enter`.

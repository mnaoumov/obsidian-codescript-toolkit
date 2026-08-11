# Start here

This is an [Obsidian](https://obsidian.md/) vault that documents the [CodeScript Toolkit](https://community.obsidian.md/plugins/fix-require-modules) plugin by demonstrating it. Every feature has a note; every note explains what the feature is for and gives you a button that runs it for real. Read it here on GitHub, or open it in Obsidian and click things.

The plugin does one thing, in a lot of directions: it lets you **write and run JavaScript or TypeScript inside Obsidian** — in a note, as a command, on a hotkey, at startup — with the module system you would expect from a real project rather than the cut-down one Obsidian ships with.

> [!WARNING] This vault is a sandbox
>
> It is a temporary copy, extracted somewhere under your system's temp folder and cleaned up automatically about a day after you last use it. Running **CodeScript Toolkit: Open demo vault** again makes a *new* copy with the latest plugin version, so anything you wrote in the old one will not be there. Copy anything you want to keep into your own vault.

## Your first thirty seconds

1. Open [Relative path](<./08 Relative path.md>).
2. Click **Require relative path**. A notice appears, and the results panel under the button shows what the script printed.
3. Click the `</>` toggle beside the button. That is the code that just ran — three lines, in this note, no build step.
4. Right-click the button and choose **Copy source** if you want to take it with you.

That is the whole model: code lives in the note, runs on click, and shows you its own source. Everything below is a variation on it.

> [!WARNING] Mobile support
>
> The examples here are written for Desktop, and most features do **not** work with `require()` on mobile. Almost all of them work anyway once the call is asynchronous — see [Migrate to async](<./40 Core functions.md#Migrate to async>), and the platform table at the bottom of each note.

## Start here

| Note                                          | What it covers                                                                                                               |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [40 Core functions](<./40 Core functions.md>) | `require()`, `requireAsync()`, `requireAsyncWrapper()` — which to use, and why it decides whether your script runs on mobile |
| [38 Code buttons](<./38 Code buttons.md>)     | Runnable snippets inside a note: the thing every other note is built out of                                                  |

## Where your code lives

| Note                                                              | What it covers                                                                     |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [08 Relative path](<./08 Relative path.md>)                       | `./helper.js` — split code across files the way you would in any project           |
| [09 Root-relative path](<./09 Root-relative path.md>)             | `/script.js` — address scripts from your scripts folder, not from the current note |
| [10 System root path](<./10 System root path.md>)                 | `~/code/lib.js` — reach outside the vault on Linux and macOS                       |
| [11 Vault-root-relative path](<./11 Vault-root-relative path.md>) | `//notes/data.js` — address anything from the vault root                           |
| [12 TFile](<./12 TFile.md>)                                       | Pass an Obsidian file object straight to `require()`                               |
| [13 Wikilinks](<./13 Wikilinks.md>)                               | Require through a wikilink, so renames keep it working                             |
| [14 Markdown links](<./14 Markdown links.md>)                     | The same, for vaults that use markdown-style links                                 |

## What you can load

| Note                                                      | What it covers                                              |
| --------------------------------------------------------- | ----------------------------------------------------------- |
| [15 ECMAScript modules](<./15 ECMAScript modules.md>)     | `import`/`export`, which Obsidian's own `require()` refuses |
| [16 TypeScript modules](<./16 TypeScript modules.md>)     | `.ts` files with no build step and no watcher               |
| [19 JSON files](<./19 JSON files.md>)                     | Config and data files, parsed for you                       |
| [23 Markdown files](<./23 Markdown files.md>)             | Keep the code in a note, beside the prose explaining it     |
| [20 Node binaries](<./20 Node binaries.md>)               | Compiled native addons — `.node`                            |
| [21 WebAssembly](<./21 WebAssembly.md>)                   | `.wasm`, and unlike native addons it works on mobile        |
| [22 ASAR archives](<./22 ASAR.md>)                        | Read inside an Electron archive as if it were a folder      |
| [24 Override module type](<./24 Override module type.md>) | Load a file whose extension lies about what it is           |

## Modules you did not write

| Note                                                                             | What it covers                                                    |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [02 Built-in modules](<./02 Built-in modules.md>)                                | `obsidian`, CodeMirror, Lezer — the same API plugins use          |
| [03 `obsidian/app` module](<./03 obsidian-app.md>)                               | A supported way to get the `App`, now the global is gone          |
| [04 `obsidian/specialModuleNames` module](<./04 obsidian-specialModuleNames.md>) | Ask which module names are special, instead of hard-coding a list |
| [05 `obsidian-dev-utils` module](<./05 obsidian-dev-utils.md>)                   | Modal dialogs and helpers written for plugin development          |
| [06 `codescript-toolkit` module](<./06 codescript-toolkit.md>)                   | This plugin's own API — prototype a plugin without writing one    |
| [07 Additional desktop modules](<./07 Additional desktop modules.md>)            | Electron internals: native dialogs, clipboard, fonts              |
| [17 NPM modules](<./17 NPM modules.md>)                                          | Anything from npm, installed into your scripts folder             |
| [18 Node built-in modules](<./18 Node built-in modules.md>)                      | `fs`, `path`, `child_process` — the escape hatch                  |

## Loading from somewhere else

| Note                                        | What it covers                                         |
| ------------------------------------------- | ------------------------------------------------------ |
| [26 URLs](<./26 URLs.md>)                   | Run code straight from an HTTPS URL, nothing installed |
| [27 File URLs](<./27 File URLs.md>)         | Reach a file outside the vault, including on Windows   |
| [28 Resource URLs](<./28 Resource URLs.md>) | Require an `app://` URL Obsidian handed you            |

## Behavior and performance

| Note                                                    | What it covers                                                    |
| ------------------------------------------------------- | ----------------------------------------------------------------- |
| [29 Top-level await](<./29 Top-level await.md>)         | `await` at module level, without an `async main()` wrapper        |
| [30 Smart caching](<./30 Smart caching.md>)             | Edit a script and re-run it without restarting anything           |
| [33 Clear cache](<./33 Clear cache.md>)                 | Drop the cache when you deliberately told it not to invalidate    |
| [25 Skip transpilation](<./25 Skip transpilation.md>)   | Run large prebuilt bundles as-is instead of through Babel         |
| [31 Dynamic import](<./31 Dynamic import.md>)           | `import()` as an expression, wired to `requireAsync()`            |
| [32 requireAsyncWrapper](<./32 requireAsyncWrapper.md>) | Use async-only features from synchronous-looking code             |
| [34 Source maps](<./34 Source maps.md>)                 | Breakpoints land on the code you wrote, not the transpiled output |

## Running scripts without a button

| Note                                                | What it covers                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| [35 Invocable scripts](<./35 Invocable scripts.md>) | Export `invoke()` and your script becomes an Obsidian command      |
| [41 Invoke scripts](<./41 Invoke scripts.md>)       | Point at a folder; every script in it gets a command automatically |
| [36 Startup script](<./36 Startup script.md>)       | One script that runs every time Obsidian loads                     |
| [37 Hotkeys](<./37 Hotkeys.md>)                     | Bind a script to a key, like any other command                     |
| [39 Protocol URLs](<./39 Protocol URLs.md>)         | Trigger a script from outside Obsidian, via `obsidian://`          |

## Code buttons in depth

| Note                                                    | What it covers                                                                    |
| ------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [42 Code button config](<./42 Code button config.md>)   | Every option a button takes — caption, auto-run, self-removal, showing its source |
| [43 Code button context](<./43 Code button context.md>) | The API a running button can call: draw UI, render markdown, edit its own note    |

## Working with other plugins

| Note                                                                                  | What it covers                                                                                 |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [01 Integrate with other plugins](<./01 Integrate with other plugins/01-00 Start.md>) | Two-way integration with Dataview, Datacore, Templater, QuickAdd, JS Engine, CustomJS, Modules |

None of these integrations is required. The plugin is self-sufficient — these notes are for when you already use one of those plugins and want the two to cooperate.

## Tips

If you plan to write more than a handful of scripts, keep them in a [dot folder](https://en.wikipedia.org/wiki/Hidden_file_and_hidden_directory#Unix_and_Unix-like_environments) such as `.scripts`. Obsidian does not track changes inside dot folders, so it will not re-index a `node_modules` tree every time you touch a file.

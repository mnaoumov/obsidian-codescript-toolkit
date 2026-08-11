# Start here

This is an [Obsidian](https://obsidian.md/) vault that documents the [CodeScript Toolkit](https://community.obsidian.md/plugins/fix-require-modules) plugin by demonstrating it. Every feature has a note; every note explains what the feature is for and gives you a button that runs it for real. Read it here on GitHub, or open it in Obsidian and click things.

The plugin does one thing, in a lot of directions: it lets you **write and run JavaScript or TypeScript inside Obsidian** — in a note, as a command, on a hotkey, at startup — with the module system you would expect from a real project rather than the cut-down one Obsidian ships with.

> [!WARNING] This vault is a sandbox
>
> It is a temporary copy, extracted somewhere under your system's temp folder and cleaned up automatically about a day after you last use it. Running **CodeScript Toolkit: Open demo vault** again makes a *new* copy with the latest plugin version, so anything you wrote in the old one will not be there. Copy anything you want to keep into your own vault.

## Your first thirty seconds

1. Open [Relative path](<./03 Relative path.md>).
2. Click **Require relative path**. A notice appears, and the results panel under the button shows what the script printed.
3. Click the `</>` toggle beside the button. That is the code that just ran — three lines, in this note, no build step.
4. Right-click the button and choose **Copy source** if you want to take it with you.

That is the whole model: code lives in the note, runs on click, and shows you its own source. Everything below is a variation on it.

> [!WARNING] Mobile support
>
> The examples here are written for Desktop, and most features do **not** work with `require()` on mobile. Almost all of them work anyway once the call is asynchronous — see [Migrate to async](<./02 Core functions.md#migrate-to-async>), and the platform table at the bottom of each note.

## Start here

| Note                                          | What it covers                                                                                                               |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [01 Code buttons](<./01 Code buttons.md>)     | Runnable snippets inside a note: the thing every other note is built out of                                                  |
| [02 Core functions](<./02 Core functions.md>) | `require()`, `requireAsync()`, `requireAsyncWrapper()` — which to use, and why it decides whether your script runs on mobile |

## Where your code lives

| Note                                                              | What it covers                                                                     |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [03 Relative path](<./03 Relative path.md>)                       | `./helper.js` — split code across files the way you would in any project           |
| [04 Root-relative path](<./04 Root-relative path.md>)             | `/script.js` — address scripts from your scripts folder, not from the current note |
| [05 System root path](<./05 System root path.md>)                 | `~/code/lib.js` — reach outside the vault on Linux and macOS                       |
| [06 Vault-root-relative path](<./06 Vault-root-relative path.md>) | `//notes/data.js` — address anything from the vault root                           |
| [07 TFile](<./07 TFile.md>)                                       | Pass an Obsidian file object straight to `require()`                               |
| [08 Wikilinks](<./08 Wikilinks.md>)                               | Require through a wikilink, so renames keep it working                             |
| [09 Markdown links](<./09 Markdown links.md>)                     | The same, for vaults that use markdown-style links                                 |

## What you can load

| Note                                                      | What it covers                                              |
| --------------------------------------------------------- | ----------------------------------------------------------- |
| [10 ECMAScript modules](<./10 ECMAScript modules.md>)     | `import`/`export`, which Obsidian's own `require()` refuses |
| [11 TypeScript modules](<./11 TypeScript modules.md>)     | `.ts` files with no build step and no watcher               |
| [12 JSON files](<./12 JSON files.md>)                     | Config and data files, parsed for you                       |
| [13 Markdown files](<./13 Markdown files.md>)             | Keep the code in a note, beside the prose explaining it     |
| [14 Node binaries](<./14 Node binaries.md>)               | Compiled native addons — `.node`                            |
| [15 WebAssembly](<./15 WebAssembly.md>)                   | `.wasm`, and unlike native addons it works on mobile        |
| [16 ASAR archives](<./16 ASAR.md>)                        | Read inside an Electron archive as if it were a folder      |
| [17 Override module type](<./17 Override module type.md>) | Load a file whose extension lies about what it is           |

## Modules you did not write

| Note                                                                             | What it covers                                                    |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [18 Built-in modules](<./18 Built-in modules.md>)                                | `obsidian`, CodeMirror, Lezer — the same API plugins use          |
| [19 `obsidian/app` module](<./19 obsidian-app.md>)                               | A supported way to get the `App`, now the global is gone          |
| [20 `obsidian/specialModuleNames` module](<./20 obsidian-specialModuleNames.md>) | Ask which module names are special, instead of hard-coding a list |
| [21 `obsidian-dev-utils` module](<./21 obsidian-dev-utils.md>)                   | Modal dialogs and helpers written for plugin development          |
| [22 `codescript-toolkit` module](<./22 codescript-toolkit.md>)                   | This plugin's own API — prototype a plugin without writing one    |
| [23 Additional desktop modules](<./23 Additional desktop modules.md>)            | Electron internals: native dialogs, clipboard, fonts              |
| [24 NPM modules](<./24 NPM modules.md>)                                          | Anything from npm, installed into your scripts folder             |
| [25 Node built-in modules](<./25 Node built-in modules.md>)                      | `fs`, `path`, `child_process` — the escape hatch                  |

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
| [31 Clear cache](<./31 Clear cache.md>)                 | Drop the cache when you deliberately told it not to invalidate    |
| [32 Skip transpilation](<./32 Skip transpilation.md>)   | Run large prebuilt bundles as-is instead of through Babel         |
| [33 Dynamic import](<./33 Dynamic import.md>)           | `import()` as an expression, wired to `requireAsync()`            |
| [34 requireAsyncWrapper](<./34 requireAsyncWrapper.md>) | Use async-only features from synchronous-looking code             |
| [35 Source maps](<./35 Source maps.md>)                 | Breakpoints land on the code you wrote, not the transpiled output |

## Running scripts without a button

| Note                                                | What it covers                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| [36 Invocable scripts](<./36 Invocable scripts.md>) | Export `invoke()` and your script becomes an Obsidian command      |
| [37 Invoke scripts](<./37 Invoke scripts.md>)       | Point at a folder; every script in it gets a command automatically |
| [38 Startup script](<./38 Startup script.md>)       | One script that runs every time Obsidian loads                     |
| [39 Hotkeys](<./39 Hotkeys.md>)                     | Bind a script to a key, like any other command                     |
| [40 Protocol URLs](<./40 Protocol URLs.md>)         | Trigger a script from outside Obsidian, via `obsidian://`          |

## Code buttons in depth

| Note                                                    | What it covers                                                                    |
| ------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [41 Code button config](<./41 Code button config.md>)   | Every option a button takes — caption, auto-run, self-removal, showing its source |
| [42 Code button context](<./42 Code button context.md>) | The API a running button can call: draw UI, render markdown, edit its own note    |

## Working with other plugins

| Note                                                                                  | What it covers                                                                                 |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [43 Integrate with other plugins](<./43 Integrate with other plugins/43-00 Start.md>) | Two-way integration with Dataview, Datacore, Templater, QuickAdd, JS Engine, CustomJS, Modules |

None of these integrations is required. The plugin is self-sufficient — these notes are for when you already use one of those plugins and want the two to cooperate.

## Tips

If you plan to write more than a handful of scripts, keep them in a [dot folder](https://en.wikipedia.org/wiki/Hidden_file_and_hidden_directory#Unix_and_Unix-like_environments) such as `.scripts`. Obsidian does not track changes inside dot folders, so it will not re-index a `node_modules` tree every time you touch a file.

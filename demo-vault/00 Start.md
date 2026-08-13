# Start here

This is an [Obsidian](https://obsidian.md/) vault that documents the [CodeScript Toolkit](https://community.obsidian.md/plugins/fix-require-modules) plugin by demonstrating it. Every feature has a note; every note explains what the feature is for and gives you a button that runs it for real. Read it here on GitHub, or open it in Obsidian and click things.

The plugin does one thing, in a lot of directions: it lets you **write and run JavaScript or TypeScript inside Obsidian** — in a note, as a command, on a hotkey, at startup — with the module system you would expect from a real project rather than the cut-down one Obsidian ships with.

> [!WARNING] This vault is a sandbox
>
> It is a temporary copy, extracted somewhere under your system's temp folder and cleaned up automatically about a day after you last use it. Running **CodeScript Toolkit: Open demo vault** again makes a *new* copy with the latest plugin version, so anything you wrote in the old one will not be there. Copy anything you want to keep into your own vault.

## Your first thirty seconds

1. Open [Relative path](<./01 Where your code lives/04 Relative path.md>).
2. Click **Require relative path**. A notice appears, and the results panel under the button shows what the script printed.
3. Click the `</>` toggle beside the button. That is the code that just ran — three lines, in this note, no build step.
4. Right-click the button and choose **Copy source** if you want to take it with you.

That is the whole model: code lives in the note, runs on click, and shows you its own source. Everything below is a variation on it.

> [!WARNING] Mobile support
>
> The examples here are written for Desktop, and most features do **not** work with `require()` on mobile. Almost all of them work anyway once the call is asynchronous — see [Migrate to async](<./02 Core functions.md#migrate-to-async>), and the platform table at the bottom of each note.

## Start here

| Note                                              | What it covers                                                                                                               |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [01 Code buttons](<./01 Code buttons.md>)         | Runnable snippets inside a note: the thing every other note is built out of                                                  |
| [02 Core functions](<./02 Core functions.md>)     | `require()`, `requireAsync()`, `requireAsyncWrapper()` — which to use, and why it decides whether your script runs on mobile |
| [03 DevTools Console](<./03 DevTools Console.md>) | The other place your code can run: require a module and poke at it interactively                                             |

## Then work through the folders

Each folder below opens with a note of its own listing what is inside, so the File Explorer says what every note is for without coming back here.

| Folder                                                                                   | What it covers                                                            |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [01 Where your code lives](<./01 Where your code lives/README.md>)                       | Every path form `require()` accepts, from `./helper.js` to a wikilink     |
| [02 What you can load](<./02 What you can load/README.md>)                               | ES modules, TypeScript, JSON, WebAssembly, native addons — no build step  |
| [03 Modules you did not write](<./03 Modules you did not write/README.md>)               | Obsidian internals, this plugin's API, Electron, Node built-ins, npm      |
| [04 Loading from somewhere else](<./04 Loading from somewhere else/README.md>)           | Code that is not a file in your vault: HTTPS, `file://` and `app://` URLs |
| [05 Behavior and performance](<./05 Behavior and performance/README.md>)                 | Caching, top-level `await`, transpilation and where breakpoints land      |
| [06 Running scripts without a button](<./06 Running scripts without a button/README.md>) | Commands, hotkeys, a startup script, and `obsidian://` URLs               |
| [07 Code buttons in depth](<./07 Code buttons in depth/README.md>)                       | Every button option, and the API a running button can call                |
| [08 Working with other plugins](<./08 Working with other plugins/README.md>)             | Two-way integration with Dataview, Datacore, Templater, QuickAdd and more |

## Tips

If you plan to write more than a handful of scripts, keep them in a [dot folder](https://en.wikipedia.org/wiki/Hidden_file_and_hidden_directory#Unix_and_Unix-like_environments) such as `.scripts`. Obsidian does not track changes inside dot folders, so it will not re-index a `node_modules` tree every time you touch a file.

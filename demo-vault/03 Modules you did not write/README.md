# Modules you did not write

Not every module comes out of your vault. These notes cover what you can require without writing it first: Obsidian's own internals, this plugin's API, Electron's desktop modules, Node's built-ins, and anything installed from npm.

| Note                                                                             | What it covers                                                    |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [19 Built-in modules](<./19 Built-in modules.md>)                                | `obsidian`, CodeMirror, Lezer — the same API plugins use          |
| [20 `obsidian/app` module](<./20 obsidian-app.md>)                               | A supported way to get the `App`, now the global is gone          |
| [21 `obsidian/specialModuleNames` module](<./21 obsidian-specialModuleNames.md>) | Ask which module names are special, instead of hard-coding a list |
| [22 `obsidian-dev-utils` module](<./22 obsidian-dev-utils.md>)                   | Modal dialogs and helpers written for plugin development          |
| [23 `codescript-toolkit` module](<./23 codescript-toolkit.md>)                   | This plugin's own API — prototype a plugin without writing one    |
| [24 Additional desktop modules](<./24 Additional desktop modules.md>)            | Electron internals: native dialogs, clipboard, fonts              |
| [25 NPM modules](<./25 NPM modules.md>)                                          | Anything from npm, installed into your scripts folder             |
| [26 Node built-in modules](<./26 Node built-in modules.md>)                      | `fs`, `path`, `child_process` — the escape hatch                  |

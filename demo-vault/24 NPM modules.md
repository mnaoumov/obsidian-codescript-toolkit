# NPM modules

Use a package from npm in a vault script — a date library, a parser, an SDK — by installing it into your scripts root and requiring it by name, exactly as you would in a Node project.

```code-button
---
caption: Require NPM modules
---
require('uuid');
```

## Options

Run `npm install <package>` inside the folder configured as the modules root (`_assets/CodeScriptToolkit` in this vault); its `node_modules` is what gets searched.

## Caveats

`node_modules` is thousands of small files, and Obsidian indexes everything in the vault. Put your scripts in a [dot folder](https://en.wikipedia.org/wiki/Hidden_file_and_hidden_directory#Unix_and_Unix-like_environments) such as `.scripts` — Obsidian skips dot folders, so it will not re-index the dependency tree on every change.

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ❌     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

[require]: <./01 Core functions.md#require>
[requireAsync]: <./01 Core functions.md#requireasync>

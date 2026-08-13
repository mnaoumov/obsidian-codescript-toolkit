# Relative path

Split your code across files and require one from another the way you would in any project — `./helper.js`, `../shared/util.js`. Without this, those paths raise `Cannot find module`, which is what pushes people into pasting every helper into every script.

The path is relative to **this note**, wherever it sits. This note lives one folder down from the vault root, so it reaches the scripts folder with `../_assets/…`; a note at the root would write `./_assets/…` for the same file. Move a note and its relative requires move with it — which is exactly why they have to be re-based when it does.

```code-button
---
caption: Require relative path
---
const { relativePath } = require('../_assets/CodeScriptToolkit/relativePath.js');
relativePath();
```

## Options

Relative to *what*? Normally the current script or note, detected automatically. When detection cannot work — the code came from a URL, a string, or a context with no file of its own — say so explicitly with `parentPath`:

```code-button
---
caption: Require relative path with custom parent path
---
const { relativePathWithCustomParentPath } = require('./_assets/CodeScriptToolkit/relativePathWithCustomParentPath.js', { parentPath: '00 Start.md' });
relativePathWithCustomParentPath();
```

Note the single `./` in that one. The button above it needed `../` to leave this folder, but here `parentPath` names a note at the vault root, so that is what `./` resolves against — the location of the note actually running the code stops mattering.

`parentPath` accepts a script or a note:

```js
require('./some/relative/path.js', { parentPath: 'path/to/current/script.js' });
require('./some/relative/path.js', { parentPath: 'path/to/current/note.md' });
```

[Parent relative path](<../Folder/Parent relative path.md>) is the same thing from a note in a different folder, so you can see the `../` hop resolve from somewhere else in the vault. If detection ever fails where you think it should work, please [open an issue](https://github.com/mnaoumov/obsidian-codescript-toolkit/issues).

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ❌     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

[require]: <../02 Core functions.md#require>
[requireAsync]: <../02 Core functions.md#requireasync>

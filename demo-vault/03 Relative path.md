# Relative path

Split your code across files and require one from another the way you would in any project — `./helper.js`, `../shared/util.js`. Without this, those paths raise `Cannot find module`, which is what pushes people into pasting every helper into every script.

```code-button
---
caption: Require relative path
---
const { relativePath } = require('./_assets/CodeScriptToolkit/relativePath.js');
relativePath();
```

## Options

Relative to *what*? Normally the current script or note, detected automatically. When detection cannot work — the code came from a URL, a string, or a context with no file of its own — say so explicitly with `parentPath`:

```code-button
---
caption: Require relative path with custom parent path
---
const { relativePathWithCustomParentPath } = require('./_assets/CodeScriptToolkit/relativePathWithCustomParentPath.js', { parentPath: 'Relative path.md' });
relativePathWithCustomParentPath();
```

`parentPath` accepts a script or a note:

```js
require('./some/relative/path.js', { parentPath: 'path/to/current/script.js' });
require('./some/relative/path.js', { parentPath: 'path/to/current/note.md' });
```

The script this note requires lives one folder down and requires a file of its own — see [Parent relative path](<./Folder/Parent relative path.md>) for that second hop. If detection ever fails where you think it should work, please [open an issue](https://github.com/mnaoumov/obsidian-codescript-toolkit/issues).

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ❌     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

[require]: <./01 Core functions.md#require>
[requireAsync]: <./01 Core functions.md#requireasync>

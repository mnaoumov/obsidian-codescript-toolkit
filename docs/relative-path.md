# Relative path

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ❌     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

Fixes `Cannot find module` errors for relative paths:

```js
require('./some/relative/path.js');
require('../some/other/relative/path.js');
```

Optionally provide the path to the current script/note if detection fails. Submit an [issue](https://github.com/mnaoumov/obsidian-codescript-toolkit/issues) if needed:

```js
require('./some/relative/path.js', { parentPath: 'path/to/current/script.js' });
require('./some/relative/path.js', { parentPath: 'path/to/current/note.md' });
```

[require]: ./core-functions.md#require
[requireAsync]: ./core-functions.md#requireasync

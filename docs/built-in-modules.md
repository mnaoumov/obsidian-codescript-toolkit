# Built-in Modules

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅       | ✅      |
| **[`requireAsync()`][requireAsync]** | ✅       | ✅      |

Certain [`Obsidian`][Obsidian] built-in modules are available for import during plugin development but show `Uncaught Error: Cannot find module` if you try to [`require()`][require] them manually. This plugin fixes that problem, allowing the following [`require()`][require] calls to work properly:

```js
require('obsidian');
require('@codemirror/autocomplete');
require('@codemirror/collab');
require('@codemirror/commands');
require('@codemirror/language');
require('@codemirror/lint');
require('@codemirror/search');
require('@codemirror/state');
require('@codemirror/text');
require('@codemirror/view');
require('@lezer/common');
require('@lezer/lr');
require('@lezer/highlight');
```

Example usage:

```js
const obsidian = require('obsidian');
new obsidian.Notice('My notice');

const { Notice } = require('obsidian');
new Notice('My notice');

import { Notice } from 'obsidian';
new Notice('My notice');
```

[Obsidian]: https://obsidian.md/
[require]: ./core-functions.md#require
[requireAsync]: ./core-functions.md#requireasync

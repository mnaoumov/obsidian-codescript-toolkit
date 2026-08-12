# Built-in modules

Obsidian ships the modules plugin authors build against — `obsidian` itself, the CodeMirror editor packages, the Lezer parsers — but asking for one from a script normally fails with `Uncaught Error: Cannot find module`. This makes them requirable, so a script in your vault can call exactly the same API a real plugin would: show a `Notice`, read the vault, drive the editor.

```code-button
---
caption: Require built-in modules
---
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

## Ways to write it

All three forms work and give you the same module:

```js
const obsidian = require('obsidian');
new obsidian.Notice('My notice');

const { Notice } = require('obsidian');
new Notice('My notice');

import { Notice } from 'obsidian';
new Notice('My notice');
```

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ✅     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

[require]: <../02 Core functions.md#require>
[requireAsync]: <../02 Core functions.md#requireasync>

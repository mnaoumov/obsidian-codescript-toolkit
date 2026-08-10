# `obsidian-dev-utils` module

[Obsidian Dev Utils](https://github.com/mnaoumov/obsidian-dev-utils/) is a library of helpers written for Obsidian plugin development — modal dialogs, async utilities, path and frontmatter handling. Requiring it from a script saves you re-implementing them: the button below opens a real Obsidian alert dialog in three lines.

```code-button
---
caption: 'Require obsidian-dev-utils module'
---
const { alert } = require('obsidian-dev-utils/obsidian/modals/alert');

await alert({
  app,
  message: 'Require obsidian-dev-utils module example'
});
```

## Options

Any of the library's entry points can be required:

```js
require('obsidian-dev-utils');
require('obsidian-dev-utils/async');
require('obsidian-dev-utils/obsidian/modals/alert');
```

## Caveats

[script-utils](https://github.com/mnaoumov/obsidian-dev-utils/tree/main/src/script-utils) is not available — it is build tooling meant for Node, not for code running inside Obsidian.

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ✅     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

[require]: <./40 Core functions.md#require>
[requireAsync]: <./40 Core functions.md#requireasync>

# `@mnaoumov/obsidian-lib` and `@mnaoumov/typescript-lib` modules

[`@mnaoumov/obsidian-lib`](https://github.com/mnaoumov/obsidian-lib/) is a library of helpers written for Obsidian plugin development — modal dialogs, frontmatter and metadata-cache handling, community plugin management. [`@mnaoumov/typescript-lib`](https://github.com/mnaoumov/typescript-lib/) holds the helpers that have nothing to do with Obsidian — async utilities, paths, strings. Both ship inside the plugin, so a script can require them without a `node_modules` folder: the button below opens a real Obsidian alert dialog in three lines.

```code-button
---
caption: 'Require @mnaoumov/obsidian-lib module'
---
const { alert } = require('@mnaoumov/obsidian-lib/modals/alert');

await alert({
  app,
  message: 'Require @mnaoumov/obsidian-lib module example'
});
```

## Options

Any of the libraries' entry points can be required:

```js
require('@mnaoumov/obsidian-lib');
require('@mnaoumov/obsidian-lib/modals/alert');
require('@mnaoumov/typescript-lib');
require('@mnaoumov/typescript-lib/async');
```

## Caveats

[Obsidian Dev Utils](https://github.com/mnaoumov/obsidian-dev-utils/), the library these two replace, still works the same way, so existing scripts keep running. It is no longer developed, so prefer the new names in new scripts:

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

Its [script-utils](https://github.com/mnaoumov/obsidian-dev-utils/tree/107.0.0/src/script-utils) is not available — it is build tooling meant for Node, not for code running inside Obsidian.

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ✅     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

[require]: <../02 Core functions.md#require>
[requireAsync]: <../02 Core functions.md#requireasync>

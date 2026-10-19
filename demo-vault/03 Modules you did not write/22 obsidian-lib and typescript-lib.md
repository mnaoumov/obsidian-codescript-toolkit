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

[Obsidian Dev Utils](https://github.com/mnaoumov/obsidian-dev-utils/), the library these two replace, is retired and no longer ships with the plugin. A script that still requires or imports it fails with an error naming the module to use instead. Rename the imports like this:

| Old import                        | New import                     |
| --------------------------------- | ------------------------------ |
| `obsidian-dev-utils/obsidian/<x>` | `@mnaoumov/obsidian-lib/<x>`   |
| `obsidian-dev-utils/<x>`          | `@mnaoumov/typescript-lib/<x>` |

For example, `require('obsidian-dev-utils/obsidian/modals/alert')` becomes `require('@mnaoumov/obsidian-lib/modals/alert')`. The library's own [import map](https://github.com/mnaoumov/obsidian-dev-utils#import-map) lists the few modules that moved elsewhere. Its `script-utils` has no replacement here — it was build tooling meant for Node, not for code running inside Obsidian.

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ✅     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

[require]: <../02 Core functions.md#require>
[requireAsync]: <../02 Core functions.md#requireasync>

# ECMAScript modules

Modern JavaScript is written with `import`/`export`, but Obsidian's built-in `require()` only understands the older CommonJS format and refuses ES modules outright: `require() of ES Module ... not supported`. This runs both, so you can write scripts the way the rest of the JavaScript world does — and mix the two freely.

```code-button
---
caption: Require ECMAScript modules
---
const { cjs } = require('/ModuleTypes/module.cjs');
cjs();

const { mjs } = require('/ModuleTypes/module.mjs');
mjs();

const { jsAsCjs } = require('/ModuleTypes/moduleAsCjs.js');
jsAsCjs();

const { jsAsMjs } = require('/ModuleTypes/moduleAsMjs.js');
jsAsMjs();
```

## Options

The `import` form works too, and reads better for it. Both buttons load the same four modules:

```code-button
---
caption: Import ECMAScript modules
---
import { cjs } from '/ModuleTypes/module.cjs';
cjs();

import { mjs } from '/ModuleTypes/module.mjs';
mjs();

import { jsAsCjs } from '/ModuleTypes/moduleAsCjs.js';
jsAsCjs();

import { jsAsMjs } from '/ModuleTypes/moduleAsMjs.js';
jsAsMjs();
```

`.js` is decided by the nearest `package.json`: with `"type": "module"` it is an ES module, without it CommonJS. `.cjs` and `.mjs` say so in the extension.

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ❌     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

[require]: <../02 Core functions.md#require>
[requireAsync]: <../02 Core functions.md#requireasync>

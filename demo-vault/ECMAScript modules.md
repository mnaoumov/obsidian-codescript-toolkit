[Docs](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/esm.md)

```code-button
---
caption: Require ECMAScript modules
---
const { cjs } = require('/module.cjs');
cjs();

const { mjs } = require('/module.mjs');
mjs();

const { jsAsCjs } = require('/moduleAsCjs.js');
jsAsCjs();

const { jsAsMjs } = require('/moduleAsMjs.js');
jsAsMjs();
```

```code-button
---
caption: Import ECMAScript modules
---
import { cjs } from '/module.cjs';
cjs();

import { mjs } from '/module.mjs';
mjs();

import { jsAsCjs } from '/moduleAsCjs.js';
jsAsCjs();

import { jsAsMjs } from '/moduleAsMjs.js';
jsAsMjs();
```

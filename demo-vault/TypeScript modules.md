[Docs](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/typescript.md)

```code-button
---
caption: Require TypeScript modules
---
const { cts } = require('/module.cts');
cts();

const { mts } = require('/module.mts');
mts();

const { tsAsCts } = require('/moduleAsCts.ts');
tsAsCts();

const { tsAsMts } = require('/moduleAsMts.ts');
tsAsMts();
```

```code-button
---
caption: Import TypeScript modules
---
import { cts } from '/module.cts';
cts();

import { mts } from '/module.mts';
mts();

import { tsAsCts } from '/moduleAsCts.ts';
tsAsCts();

import { tsAsMts } from '/moduleAsMts.ts';
tsAsMts();
```

# TypeScript modules

Write your vault scripts in TypeScript and require them directly — no build step, no watcher, no `dist/` folder. Types are stripped on load, so you get editor autocomplete and type-checking in your IDE while Obsidian runs plain JavaScript.

```code-button
---
caption: Require TypeScript modules
---
const { cts } = require('/ModuleTypes/module.cts');
cts();

const { mts } = require('/ModuleTypes/module.mts');
mts();

const { tsAsCts } = require('/ModuleTypes/moduleAsCts.ts');
tsAsCts();

const { tsAsMts } = require('/ModuleTypes/moduleAsMts.ts');
tsAsMts();
```

```code-button
---
caption: Import TypeScript modules
---
import { cts } from '/ModuleTypes/module.cts';
cts();

import { mts } from '/ModuleTypes/module.mts';
mts();

import { tsAsCts } from '/ModuleTypes/moduleAsCts.ts';
tsAsCts();

import { tsAsMts } from '/ModuleTypes/moduleAsMts.ts';
tsAsMts();
```

## Caveats

> [!WARNING]
>
> Types are **stripped, not checked**. The plugin reports an error only when the code is syntactically invalid; it never type-checks, because that is the job of your IDE or `tsc`.
>
> So a module that would not compile can still load here, and fail at runtime instead:
>
> ```ts
> interface Alpha {
>   bravo: string;
> }
>
> export function printFoo(alpha: Alpha): void {
>   console.log(alpha.barWithTypo); // a real compiler would reject this line
> }
> ```
>
> After stripping, that is simply:
>
> ```js
> export function printFoo(alpha) {
>   console.log(alpha.barWithTypo);
> }
> ```
>
> so `require('/FooModule.ts').printFoo({ bravo: 'charlie' })` logs `undefined` rather than `charlie`. Validate TypeScript modules with an IDE or compiler; treat this as a runtime, not a build.

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ❌     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

[require]: <../02 Core functions.md#require>
[requireAsync]: <../02 Core functions.md#requireasync>

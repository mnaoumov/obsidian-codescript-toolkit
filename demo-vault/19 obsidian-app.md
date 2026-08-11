# `obsidian/app` module

Nearly every Obsidian API call starts from an `App` instance. The old global `app` variable still exists, but it was deprecated in Obsidian 1.3.5 and removed from the public API in 1.6.6 — so relying on it is borrowing against a variable that may disappear. This gives you a supported way to ask for it instead.

```code-button
---
caption: 'Require obsidian/app module'
---
require('obsidian/app');
```

## Ways to write it

```js
const app = require('obsidian/app');

// or

import app from 'obsidian/app';
```

To type-check scripts that use it with `tsc` or in an IDE, declare the module:

```ts
// types.d.ts
declare module 'obsidian/app' {
  import type { App } from 'obsidian';

  const app: App;
  export default app;
}
```

## Caveats

> [!WARNING]
>
> Prefer passing `app` in explicitly over reaching for this module inside a function. A function that takes `app` as an argument is testable and reusable; one that requires it is neither.
>
> ```ts
> // BAD
> export function fn(): void {
>   const app = require('obsidian/app');
>   console.log(app.plugins);
> }
>
> // GOOD
> export function fn(app: App): void {
>   console.log(app.plugins);
> }
> ```

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ✅     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

[require]: <./01 Core functions.md#require>
[requireAsync]: <./01 Core functions.md#requireasync>

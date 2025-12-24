# `obsidian/app` module

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ✅     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

There is a global variable `app` that gives access to [`Obsidian`][Obsidian] [`App`][App] instance.

However, starting from [`Obsidian`][Obsidian] [`v1.3.5`](https://github.com/obsidianmd/obsidian-api/commit/7646586acccf76f877b64111b2398938acc1d53e#diff-0eaea5db2513fdc5fe65d534d3591db5b577fe376925187c8a624124632b7466R4708) this global variable is deprecated in the public API.

Starting from [`Obsidian`][Obsidian] [`v1.6.6`](https://github.com/obsidianmd/obsidian-api/commit/f20b17e38ccf12a8d7f62231255cb0608436dfbf#diff-0eaea5db2513fdc5fe65d534d3591db5b577fe376925187c8a624124632b7466L4950-L4959) this global variable was completely removed from the public API.

Currently this global variable is still available, but it's better not rely on it, as it is not guaranteed to be maintained.

This plugin gives you a safer alternative:

```js
const app = require('obsidian/app');

// or

import app from 'obsidian/app';
```

If you want to add `obsidian/app` to your TypeScript scripts and validate them via `tsc` or TypeScript IDE, you need to add additional type definition.

```ts
// types.d.ts
declare module 'obsidian/app' {
  import type { App } from 'obsidian';

  const app: App;
  export default app;
}
```

> [!WARNING]
>
> You should avoid using `obsidian/app` module, and prefer to pass `app` variable explicitly.
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

[App]: https://docs.obsidian.md/Reference/TypeScript+API/App
[Obsidian]: https://obsidian.md/
[require]: ./core-functions.md#require
[requireAsync]: ./core-functions.md#requireasync

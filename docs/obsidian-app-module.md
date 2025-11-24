# `obsidian/app` module

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅       | ✅      |
| **[`requireAsync()`][requireAsync]** | ✅       | ✅      |

There is a global variable `app` that gives access to [`Obsidian`][Obsidian] [`App`][App] instance.

However, starting from [`Obsidian`][Obsidian] [`v1.3.5`](https://github.com/obsidianmd/obsidian-api/commit/7646586acccf76f877b64111b2398938acc1d53e#diff-0eaea5db2513fdc5fe65d534d3591db5b577fe376925187c8a624124632b7466R4708) this global variable is deprecated in the public API.

Starting from [`Obsidian`][Obsidian] [`v1.6.6`](https://github.com/obsidianmd/obsidian-api/commit/f20b17e38ccf12a8d7f62231255cb0608436dfbf#diff-0eaea5db2513fdc5fe65d534d3591db5b577fe376925187c8a624124632b7466L4950-L4959) this global variable was completely removed from the public API.

Currently this global variable is still available, but it's better not rely on it, as it is not guaranteed to be maintained.

This plugin gives you a safer alternative:

```js
require('obsidian/app');
```

[App]: https://docs.obsidian.md/Reference/TypeScript+API/App
[Obsidian]: https://obsidian.md/
[require]: ./core-functions.md#require
[requireAsync]: ./core-functions.md#requireasync

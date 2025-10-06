# `obsidian/specialModuleNames` module

|                                       | Desktop | Mobile |
| ------------------------------------- | ------- | ------ |
| **[`require()`][require]           | ✅       | ✅      |
| **[`requireAsync()`][requireAsync] | ✅       | ✅      |

You can access the list of all special [`Obsidian`][Obsidian] module names that are made available by this plugin. This includes module names like `obsidian`, `@codemirror/view`, etc.

```js
require('obsidian/specialModuleNames');
```

[Obsidian]: https://obsidian.md/
[require]: ./new-functions.md#require
[requireAsync]: ./new-functions.md#requireasync

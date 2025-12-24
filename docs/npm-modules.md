# NPM modules

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ❌     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

You can require NPM modules installed into your configured scripts root folder.

```js
require('npm-package-name');
```

See [Tips](./usage.md#tips) how to avoid performance issues.

[require]: ./core-functions.md#require
[requireAsync]: ./core-functions.md#requireasync

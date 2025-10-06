# NPM modules

|                                       | Desktop | Mobile |
| ------------------------------------- | ------- | ------ |
| **[`require()`][require]           | ✅       | ❌      |
| **[`requireAsync()`][requireAsync] | ✅       | ✅      |

You can require NPM modules installed into your configured scripts root folder.

```js
require('npm-package-name');
```

See [Tips](./usage.md#tips) how to avoid performance issues.

[require]: ./new-functions.md#require
[requireAsync]: ./new-functions.md#requireasync

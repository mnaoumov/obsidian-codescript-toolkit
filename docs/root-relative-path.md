# Root-relative path

|                                       | Desktop | Mobile |
| ------------------------------------- | ------- | ------ |
| **[`require()`][require]           | ✅       | ❌      |
| **[`requireAsync()`][requireAsync] | ✅       | ✅      |

Adds support for root-relative paths:

```js
require('/path/from/root.js');
```

The root `/` folder is configurable via settings.

[require]: ./new-functions.md#require
[requireAsync]: ./new-functions.md#requireasync

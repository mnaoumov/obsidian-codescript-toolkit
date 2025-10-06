# System root path (Linux, MacOS)

|                                       | Desktop | Mobile |
| ------------------------------------- | ------- | ------ |
| **[`require()`][require]           | ✅       | ❌      |
| **[`requireAsync()`][requireAsync] | ✅       | ✅      |

On Linux and MacOS, the system root path is `/path/from/system/root.js`.

In order to distinguish them from [root-relative path](./root-relative-path.md), you need to prepend `~` to the path.

```js
require('~/path/from/system/root.js');
```

[require]: ./new-functions.md#require
[requireAsync]: ./new-functions.md#requireasync

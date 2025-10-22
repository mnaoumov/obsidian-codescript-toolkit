# Additional desktop modules

|                                       | Desktop | Mobile |
| ------------------------------------- | ------- | ------ |
| **[`require()`][require]**           | ✅       | ❌      |
| **[`requireAsync()`][requireAsync]** | ✅       | ❌      |

[`Obsidian`][Obsidian] on desktop is shipped with some additional modules that you can [`require()`](./new-functions.md#require).

```js
// bundled with Electron app
require('electron');
require('electron/common');
require('electron/renderer');

// packed in `app.asar`
require('@electron/remote');
require('btime');
require('get-fonts');
```

[Obsidian]: https://obsidian.md/
[require]: ./new-functions.md#require
[requireAsync]: ./new-functions.md#requireasync

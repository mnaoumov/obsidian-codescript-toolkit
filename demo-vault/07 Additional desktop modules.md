# Additional desktop modules

Obsidian on desktop is an Electron app, and it carries Electron's own modules plus a few packed into `app.asar`. Requiring them lets a script do things the Obsidian API does not expose at all — open a native dialog, read the system clipboard, list installed fonts, read a file's real creation time.

```code-button
---
caption: Require additional desktop modules
---
// bundled with Electron app
require('electron');
require('electron/common');
require('electron/renderer');

// packed in `app.asar`
require('@electron/remote');
require('btime');
require('get-fonts');
```

## Caveats

These modules exist only in the desktop app. A script that requires them will fail on mobile, so guard with `Platform.isDesktopApp` if the same script has to run on both.

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ❌     |
| **[`requireAsync()`][requireAsync]** | ✅      | ❌     |

[require]: <./40 Core functions.md#require>
[requireAsync]: <./40 Core functions.md#requireasync>

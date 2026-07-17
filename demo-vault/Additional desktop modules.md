[Docs](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/additional-desktop-modules.md)

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

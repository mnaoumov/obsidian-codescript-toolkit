# `obsidian/specialModuleNames` module

Returns the list of module names this plugin makes requirable — `obsidian`, `@codemirror/view`, and the rest of [Built-in modules](<./19 Built-in modules.md>). Useful when your script decides at runtime whether a name is a vault file or one of Obsidian's own modules, so you do not have to hard-code a list that goes stale with each Obsidian release.

```code-button
---
caption: 'Require obsidian/specialModuleNames module'
---
require('obsidian/specialModuleNames');
```

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ✅     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

[require]: <../02 Core functions.md#require>
[requireAsync]: <../02 Core functions.md#requireasync>

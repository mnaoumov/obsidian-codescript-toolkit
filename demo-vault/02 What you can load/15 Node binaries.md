# Node binaries

Load a compiled native addon (`.node`) — the format npm packages ship when part of them is written in C++. That is how you reach a native database driver, an image codec, or any library whose speed comes from not being JavaScript.

```code-button
---
caption: Require Node binaries
---
const { hello } = require('/module.node');
hello();
```

## Caveats

A `.node` file is compiled for one platform, architecture, and Node ABI version. One built for a different combination will fail to load, and Obsidian upgrades can change the ABI. Mobile cannot load them at all.

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ❌     |
| **[`requireAsync()`][requireAsync]** | ✅      | ❌     |

[require]: <../02 Core functions.md#require>
[requireAsync]: <../02 Core functions.md#requireasync>

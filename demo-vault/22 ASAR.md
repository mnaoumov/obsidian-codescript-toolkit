# ASAR archives

Require files that live *inside* an `.asar` archive as if the archive were an ordinary folder. Electron apps — Obsidian included — ship their code this way, so this is how you reach into one without unpacking it first.

```code-button
---
caption: Require ASAR
---
const { jsInsideAsar } = require('/module.asar/jsInsideAsar.js');
jsInsideAsar();
```

## Caveats

Reading an archive relies on Node's filesystem support for it, so this is desktop-only.

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ❌     |
| **[`requireAsync()`][requireAsync]** | ✅      | ❌     |

[require]: <./40 Core functions.md#require>
[requireAsync]: <./40 Core functions.md#requireasync>

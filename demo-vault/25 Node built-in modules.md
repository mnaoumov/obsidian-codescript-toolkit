# Node built-in modules

Reach Node's standard library from a vault script: read and write files outside the vault with `fs`, join paths with `path`, spawn a process with `child_process`. This is the escape hatch for anything Obsidian's own API deliberately does not cover.

```code-button
---
caption: Require Node built-in modules
---
require('fs');
require('node:path');
```

## Options

Both spellings work — bare (`fs`) and prefixed (`node:fs`). The prefixed form is unambiguous, and cannot be shadowed by an npm package of the same name.

## Caveats

Mobile has no Node runtime at all, so these modules do not exist there. Use Obsidian's `vault.adapter` API for file access that has to work on both.

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ❌     |
| **[`requireAsync()`][requireAsync]** | ✅      | ❌     |

[require]: <./02 Core functions.md#require>
[requireAsync]: <./02 Core functions.md#requireasync>

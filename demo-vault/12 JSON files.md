# JSON files

Require a `.json` file and get the parsed object back — no `read` plus `JSON.parse`, no error handling around either. Convenient for configuration, lookup tables, or any data you would rather keep beside your scripts than inline in them.

```code-button
---
caption: Require JSON files
---
require('/module.json');
```

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ✅     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

[require]: <./01 Core functions.md#require>
[requireAsync]: <./01 Core functions.md#requireasync>

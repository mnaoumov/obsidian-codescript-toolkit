[Docs](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/obsidian-dev-utils.md)

```code-button
---
caption: 'Require obsidian-dev-utils module'
---
const { alert } = require('obsidian-dev-utils/obsidian/modals/alert');

await alert({
  app,
  message: 'Require obsidian-dev-utils module example'
});
```

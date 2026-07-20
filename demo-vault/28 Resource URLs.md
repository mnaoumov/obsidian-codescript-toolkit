[Docs](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/resource-urls.md)

```code-button
---
caption: Require resource URLs
---
// The `app://` resource prefix (host hash + system path) is session-specific, so read the current one.
const resourcePrefix = app.vault.getResourcePath(app.vault.getRoot()).split('/?')[0];

const { resourceUrl } = require(`${resourcePrefix}/_assets/CodeScriptToolkit/resourceUrl.js`);
resourceUrl();
```

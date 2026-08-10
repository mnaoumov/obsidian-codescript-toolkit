# Resource URLs

Load a script by the `app://` URL Obsidian itself uses to serve vault files to the renderer. If you already have such a URL in hand — from [`getResourcePath()`](https://docs.obsidian.md/Reference/TypeScript+API/Vault/getResourcePath), or from an embed you are inspecting — you can require it directly instead of converting it back into a vault path.

```code-button
---
caption: Require resource URLs
---
// The `app://` resource prefix (host hash + system path) is session-specific, so read the current one.
const resourcePrefix = app.vault.getResourcePath(app.vault.getRoot()).split('/?')[0];

const { resourceUrl } = require(`${resourcePrefix}/_assets/CodeScriptToolkit/resourceUrl.js`);
resourceUrl();
```

## Caveats

The prefix contains a per-session host hash, so it changes between runs — read it at runtime as the button does rather than pasting one in. See [`Platform.resourcePathPrefix`](https://docs.obsidian.md/Reference/TypeScript+API/Platform#resourcePathPrefix) for the platform-specific shape.

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ❌     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

[require]: <./40 Core functions.md#require>
[requireAsync]: <./40 Core functions.md#requireasync>

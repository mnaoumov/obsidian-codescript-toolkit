# Resource URLs

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅       | ❌      |
| **[`requireAsync()`][requireAsync]** | ✅       | ✅      |

You can require files using resource URLs:

```js
require(
  'app://obsidian-resource-path-prefix/C:/path/to/vault/then/to/script.js'
);
```

See [getResourcePath()](https://docs.obsidian.md/Reference/TypeScript+API/Vault/getResourcePath) and [Platform.resourcePathPrefix](https://docs.obsidian.md/Reference/TypeScript+API/Platform#resourcePathPrefix) for more details.

[require]: ./core-functions.md#require
[requireAsync]: ./core-functions.md#requireasync

# Smart caching

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅       | ✅      |
| **[`requireAsync()`][requireAsync]** | ✅       | ✅      |

Modules are cached for performance, but the cache is invalidated if the script or its dependencies change.

You can also control cache invalidation mode:

```js
require('./someScript.js', { cacheInvalidationMode: 'always' });
require('./someScript.js', { cacheInvalidationMode: 'never' });
require('./someScript.js', { cacheInvalidationMode: 'whenPossible' });
```

- `always` - always get the latest version of the module, ignoring the cached version
- `never` - always use the cached version, ignoring the changes in the module, if any
- `whenPossible` - get the latest version of the module if possible, otherwise use the cached version

Also, you can use a query string to skip cache invalidation (except for URLs), which behaves as setting `cacheInvalidationMode` to `never`:

```js
require('./someScript.js?someQuery'); // cacheInvalidationMode: 'never'
require('https://some-site.com/some-script.js?someQuery'); // cacheInvalidationMode: 'whenPossible'
```

[require]: ./core-functions.md#require
[requireAsync]: ./core-functions.md#requireasync

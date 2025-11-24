# [`ECMAScript Modules` (`esm`)](https://nodejs.org/api/esm.html)

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅       | ❌      |
| **[`requireAsync()`][requireAsync]** | ✅       | ✅      |

Originally, [`require()`][require] only supported [`CommonJS` (`cjs`)][cjs] modules and would throw `require() of ES Module path/to/script.mjs not supported. Instead change the require of path/to/script.mjs to a dynamic import() which is available in all CommonJS modules`. This plugin adds support for ECMAScript modules:

```js
require('path/to/script.mjs');
```

Now you can use any type of JavaScript modules:

```js
require('./path/to/script.js');
require('./path/to/script.cjs');
require('./path/to/script.mjs');
```

[cjs]: https://nodejs.org/api/modules.html#modules-commonjs-modules
[require]: ./core-functions.md#require
[requireAsync]: ./core-functions.md#requireasync

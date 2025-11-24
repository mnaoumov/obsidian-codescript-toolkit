# URLs

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ❌       | ❌      |
| **[`requireAsync()`][requireAsync]** | ✅       | ✅      |

```js
await requireAsync('https://some-site.com/some-script.js');
```

Module type is determined by `Content-Type` header returned when you fetch the url.

In some cases the header is missing, incorrect or too generic like `text/plain` or `application/octet-stream`.

In those cases `jsTs` module type is assumed, but it's recommended to specify it explicitly to avoid warnings.

```js
await requireAsync('https://some-site.com/some-script.js', {
  moduleType: 'jsTs'
});
```

[require]: ./core-functions.md#require
[requireAsync]: ./core-functions.md#requireasync

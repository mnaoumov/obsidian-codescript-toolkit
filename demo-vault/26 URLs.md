# URLs

Run code straight from an HTTPS URL — nothing downloaded into your vault, nothing to install. That makes it easy to try a snippet someone posted, pull in a library from a CDN, or share a script by sending a link instead of a file.

The button below fetches a small module from this repository and runs it.

```code-button
---
caption: Require URL
---
const { url } = await requireAsync('https://raw.githubusercontent.com/mnaoumov/obsidian-codescript-toolkit/refs/heads/main/demo-vault/_assets/CodeScriptToolkit/url.js');
url();
```

## Options

The module type comes from the `Content-Type` header the server returns. That header is often missing, wrong, or too generic (`text/plain`, `application/octet-stream`); `jsTs` is then assumed, but saying so explicitly avoids the warning:

```js
await requireAsync('https://some-site.com/some-script.js', {
  moduleType: 'jsTs'
});
```

## Caveats

Fetching is asynchronous, so URLs need [`requireAsync()`](<./40 Core functions.md#requireasync>) — plain `require()` cannot load them on either platform.

Remote code runs with the same access as any other script here: your vault, your files, and on desktop your machine. Read what you are about to run, and prefer URLs you control or trust.

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ❌      | ❌     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

[require]: <./40 Core functions.md#require>
[requireAsync]: <./40 Core functions.md#requireasync>

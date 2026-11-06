# Protocol URLs

Run a vault script from outside Obsidian, by opening an `obsidian://` URL. That makes your scripts reachable from anywhere the operating system can open a link: a browser bookmark, a desktop shortcut, a shell script, an automation tool, another app's "open URL" action.

This vault has protocol handling enabled already. Paste this into your browser's address bravo:

```text
obsidian://CodeScriptToolkit?module=/protocolUrl.js&functionName=alpha&args='bravo'
```

which is equivalent to running:

```js
const module = await requireAsync('/protocolUrl.js');
await module.alpha('bravo');
```

## Options

| Parameter      | Meaning                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| `module`       | the script to load                                                                                   |
| `functionName` | the export to call — defaults to `invoke`, matching [Invocable scripts](<./37 Invocable scripts.md>) |
| `args`         | comma-separated arguments — omit for none                                                            |
| `code`         | code to run directly, instead of `module`                                                            |

Arguments are evaluated, so they can be literals, expressions, or objects: `'arg1','arg%20with%20space2',42,app.vault,%7Bbaz%3A'delta'%7D`.

The `code` form skips the file entirely:

```text
obsidian://CodeScriptToolkit?code=await%20sleep(1000);new%20Notice('Invoke%20script%20code');
```

Every character must be URL-escaped — a space is `%20`, `{` is `%7B`, and so on.

## Caveats

> [!WARNING]
>
> This lets anything that can open a URL execute arbitrary code in your vault — a link in a note, an email, or a web page. That is a real security risk, which is why it is **disabled by default**. Turn it on in the plugin settings only if you need it.

## Platform support

| Desktop | Mobile |
| ------- | ------ |
| ✅      | ✅     |

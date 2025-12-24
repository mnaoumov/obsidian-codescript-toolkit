# Protocol URLs

| Desktop | Mobile |
| ------- | ------ |
| ✅      | ✅     |

> [!WARNING]
>
> This allows arbitrary code execution, which could pose a security risk. Use with caution.
> Disabled by default.

You can invoke script files or custom code using Obsidian URL schema.

All characters has to be properly URL-escaped, e.g., you have to replace `␣` (space) with `%20`.

## Invoke script files

Opening URL

```text
obsidian://CodeScriptToolkit?module=/foo/bar.ts&functionName=baz&args='arg1','arg%20with%20space2',42,app.vault,%7Bbaz%3A'qux'%7D
```

would be equivalent to calling

```js
const module = await requireAsync('/foo/bar.ts');
await module.baz('arg1', 'arg2 with spaces', 42, app.vault, { baz: 'qux' });
```

If you omit `args` parameter, it will be treated as no arguments.

If you omit `functionName` parameter, it will treated as `invoke`, which is useful for [Invocable scripts](./invocable-scripts.md).

## Invoke custom code

Opening URL

```text
obsidian://CodeScriptToolkit?code=await%20sleep(1000);%20console.log('foo%20bar')
```

would be equivalent to calling

```js
await sleep(1000);
console.log('foo bar');
```

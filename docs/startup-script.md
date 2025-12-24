# Startup script

| Desktop | Mobile |
| ------- | ------ |
| ✅      | ✅     |

Invoke any script when [`Obsidian`][Obsidian] loads via a configuration setting.

You can add an optional `cleanup()` function to the startup script, which will be called when the plugin is unloaded.

The function has the same signature as [`invoke()`](./invocable-scripts.md) function.

```ts
import type { App } from 'obsidian';

export async function cleanup(app: App): Promise<void> {
  // executes when the plugin is unloaded
}

export async function invoke(app: App): Promise<void> {
  // executes when the plugin is loaded, including when the app is started
}
```

You can reload the startup script using the `CodeScript Toolkit: Reload startup script` command.

[Obsidian]: https://obsidian.md/

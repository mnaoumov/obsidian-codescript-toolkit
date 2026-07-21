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

By default the startup script's `invoke()` runs **after** [`Obsidian`][Obsidian] has restored the workspace layout.

You can opt into running it **before** the workspace layout is restored by adding an optional `shouldExecuteOnLoad()` function that returns `true`. This mirrors a plugin's `onload()` timing and is useful for work that must happen before the layout is deserialized, such as registering a custom view (so a restored leaf using that view renders correctly) or early monkey-patching.

```ts
import type { App } from 'obsidian';

export async function shouldExecuteOnLoad(app: App): Promise<boolean> {
  // return `true` to run `invoke()` before the workspace layout is restored (awaited),
  // or `false`/omit this function to keep the default after-layout timing
  return true;
}

export async function invoke(app: App): Promise<void> {
  // when `shouldExecuteOnLoad()` returns `true`, this executes before the layout is restored
}
```

When `shouldExecuteOnLoad()` returns `true`, `invoke()` is awaited during startup, so the app waits for it to finish before showing the UI.

You can reload the startup script using the `CodeScript Toolkit: Reload startup script` command.

[Obsidian]: https://obsidian.md/

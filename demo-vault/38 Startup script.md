# Startup script

Nominate one script to run every time Obsidian loads. It is where vault-wide setup goes: monkey-patching something, registering a custom view, wiring event handlers — the work a small plugin would do, without writing a plugin.

This vault uses one. `_assets/CodeScriptToolkit/startup.ts` is what shows the *Demo vault ready* notice, opens this start note, and binds the [`Alt + F1` hotkey](<./39 Hotkeys.md>). To watch it run again, do any of:

- invoke the `Reload app without saving` command;
- turn the `CodeScript Toolkit` plugin off and on;
- invoke the `CodeScript Toolkit: Reload startup script` command.

## Options

Point the **Startup script path** setting at any script. It can export two more functions beside `invoke()`:

```ts
import type { App } from 'obsidian';

export async function cleanup(app: App): Promise<void> {
  // executes when the plugin is unloaded
}

export async function invoke(app: App): Promise<void> {
  // executes when the plugin is loaded, including when the app is started
}
```

`cleanup()` has the same signature as [`invoke()`](<./36 Invocable scripts.md>) and runs when the plugin unloads — undo whatever `invoke()` did, so reloading the script does not leave two of everything behind.

By default `invoke()` runs **after** Obsidian has restored the workspace layout. Export `shouldExecuteOnLoad()` returning `true` to run it **before** instead, mirroring a plugin's `onload()` timing. That matters when the work must happen before the layout is deserialized — registering a custom view so a restored leaf renders correctly, or early monkey-patching:

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

## Caveats

When `shouldExecuteOnLoad()` returns `true`, `invoke()` is awaited during startup — Obsidian waits for it before showing the UI, so slow work there delays the whole app.

## Platform support

| Desktop | Mobile |
| ------- | ------ |
| ✅      | ✅     |

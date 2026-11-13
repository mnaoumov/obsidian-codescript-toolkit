# Startup script

Nominate one script to run every time Obsidian loads. It is where vault-wide setup goes: monkey-patching something, registering a custom view, wiring event handlers — the work a small plugin would do, without writing a plugin.

This vault uses one. `_assets/CodeScriptToolkit/startup.ts` is what shows the *Demo vault ready* notice, opens this start note, and binds the [`Alt + F1` hotkey](<./41 Hotkeys.md>). It runs only once you trust it on this device: the first time you open the vault, the plugin asks (see [When the script runs](#when-the-script-runs)). To watch it run again, do any of:

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

`cleanup()` has the same signature as [`invoke()`](<./37 Invocable scripts.md>) and runs when the plugin unloads — undo whatever `invoke()` did, so reloading the script does not leave two of everything behind.

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

## When-the-script-runs

> [!WARNING]
>
> The startup script runs every time the vault opens, without a click, with full access to the app and, on desktop, to Node.js. Its path is stored in the plugin's synced `data.json` and its file is an ordinary vault file, so another device, or anyone who can write to a shared vault, could set or change it.

That is why the startup script does not run until you trust it on this device. Loading the script already runs its top-level code, so an untrusted script is not even loaded. Once the workspace is ready, the plugin asks whether to trust it. Answer **Don't trust** and it does not run; you are asked again after a restart, or when you invoke the `CodeScript Toolkit: Reload startup script` command. You can trust the script, or untrust it, at any time with the **Trust startup script** button in the plugin's settings, or with the `CodeScript Toolkit: Trust startup script` and `CodeScript Toolkit: Untrust startup script` commands. Untrusting it calls its `cleanup()`.

Trust is stored in this device's `localStorage`, which is never synced, so every device asks on its own. The device keeps a list of the scripts you trusted:

- pointing the setting at a file you have not trusted asks again, but switching back to a script you trusted before does not;
- only the exact file is trusted: a trusted [invocable scripts folder](<./37 Invocable scripts.md>) does not trust a startup script inside it;
- the **Trusted startup scripts** section of the settings lists every trusted script, with a **Remove** button for each.

Trusting a script trusts its path, not its content: if someone can change the file, they can still change what runs.

When the script is trusted on first open, `invoke()` runs right away, after the layout is restored, even when `shouldExecuteOnLoad()` returns `true`. From the next launch on, it runs at the time it asks for.

## Caveats

The startup script must export `invoke()`. A script that only runs code at its top level, with no such export, is reported with a notice naming the file, and its `cleanup()` is never called.

When `shouldExecuteOnLoad()` returns `true`, `invoke()` is awaited during startup — Obsidian waits for it before showing the UI, so slow work there delays the whole app.

## Platform support

| Desktop | Mobile |
| ------- | ------ |
| ✅      | ✅     |

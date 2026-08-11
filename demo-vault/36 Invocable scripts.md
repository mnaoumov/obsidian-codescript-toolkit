# Invocable scripts

Turn a script into a real Obsidian command. Export an `invoke()` function and the script appears in the `Command Palette`, ready to be run, bound to a [hotkey](<./39 Hotkeys.md>), or called from anywhere commands can be called — no plugin to write, no manifest, no reload.

Every script below lives in this vault's invocable-scripts folder. Open the `Command Palette` and run any of them:

- `CodeScript Toolkit: Invoke script: cjsSync.cjs`
- `CodeScript Toolkit: Invoke script: cjsAsync.cjs`
- `CodeScript Toolkit: Invoke script: mjsSync.mjs`
- `CodeScript Toolkit: Invoke script: mjsAsync.mjs`
- `CodeScript Toolkit: Invoke script: ctsSync.cts`
- `CodeScript Toolkit: Invoke script: ctsAsync.cts`
- `CodeScript Toolkit: Invoke script: mtsSync.mts`
- `CodeScript Toolkit: Invoke script: mtsAsync.mts`
- `CodeScript Toolkit: Invoke script: InvokeCommands/callback.ts`
- `CodeScript Toolkit: Invoke script: InvokeCommands/checkCallback.ts`
- `CodeScript Toolkit: Invoke script: InvokeCommands/editorCallback.ts`
- `CodeScript Toolkit: Invoke script: InvokeCommands/editorCheckCallback.ts`
- `CodeScript Toolkit: Custom name`
- `CodeScript Toolkit: Async built command`
- `CodeScript Toolkit: Invoke script: InvokeCommands/deprecatedInvokeCommand.ts`

## Options

A script becomes invocable by exporting one of:

- `export function invoke(app: App): void`
- `export async function invoke(app: App): Promise<void>`
- `export function buildInvokeCommand(app: App): Partial<Command>`
- `export async function buildInvokeCommand(app: App): Promise<Partial<Command>>`

in any supported module format:

```ts
// cjs sync
exports.invoke = (app) => {
  console.log('cjs sync');
};

// cjs async
exports.invoke = async (app) => {
  console.log('cjs async');
  await Promise.resolve();
};

// mjs sync
export function invoke(app) {
  console.log('mjs sync');
}

// mjs async
export async function invoke(app) {
  console.log('mjs async');
  await Promise.resolve();
}

// cts sync
import type { App } from 'obsidian';
exports.invoke = (app: App): void => {
  console.log('cts sync');
};

// mts async
import type { App } from 'obsidian';
export async function invoke(app: App): Promise<void> {
  console.log('mts async');
  await Promise.resolve();
}
```

## `buildInvokeCommand()`

`invoke()` gives you a command that always runs. `buildInvokeCommand()` gives you the full [Obsidian command](https://docs.obsidian.md/Plugins/User+interface/Commands) instead — so the command can name itself, decide whether it is currently available, or act on the active editor. Unlike a real plugin command, `id` and `name` may be omitted and are generated for you.

Specify one of `callback` / `checkCallback` / `editorCallback` / `editorCheckCallback`. The `app` is passed in, so callbacks simply close over it — lambdas are fine, no `this` binding involved.

```ts
import type {
  App,
  Command
} from 'obsidian';

export function buildInvokeCommand(app: App): Partial<Command> {
  return {
    checkCallback: (checking: boolean): boolean => {
      const file = app.workspace.getActiveFile();
      if (!file) {
        return false;
      }

      if (!checking) {
        console.log(file.path);
      }

      return true;
    }
  };
}
```

It may be `async`, which lets you build the command from data you have to load first — such as its own name:

```ts
import type {
  App,
  Command
} from 'obsidian';

export async function buildInvokeCommand(app: App): Promise<Partial<Command>> {
  const config = JSON.parse(await app.vault.adapter.read('config.json')) as { commandName: string };

  return {
    callback: (): void => {
      console.log(`Invoked ${config.commandName}`);
    },
    name: config.commandName
  };
}
```

`buildInvokeCommand()` is called once, when the script is registered.

## Caveats

> [!NOTE]
>
> A script that exports none of the above still gets a command registered. The missing export is reported to the console and shown as a notice when the script is registered, and again whenever the command is invoked — so a broken script stays visible instead of silently disappearing.

A script whose `buildInvokeCommand()` fails behaves the same way:

> [!WARNING]
>
> If `buildInvokeCommand()` throws, the error is reported right away, when the script is registered. Its command is still registered and stays in the [`Command Palette`](https://help.obsidian.md/Plugins/Command+palette), but invoking it only repeats that error.

`InvokeCommands/deprecatedInvokeCommand.ts` in this vault fails on purpose: it exports the removed `invokeCommand` object instead of a `buildInvokeCommand()` function, so a notice about it appears when this vault loads, and invoking its command only repeats that notice.

## Migrating from `invokeCommand`

A script could once export an `invokeCommand` object rather than a function building it:

```ts
// No longer supported.
export const invokeCommand: Partial<Command> = {
  checkCallback(checking: boolean): boolean { // concise method syntax, so that `this.app` is available
    // ...
  }
};
```

Rewrite it as a `buildInvokeCommand()` function, using the `app` argument in place of `this.app`:

```ts
import type {
  App,
  Command
} from 'obsidian';

export function buildInvokeCommand(app: App): Partial<Command> {
  return {
    checkCallback: (checking: boolean): boolean => { // lambdas are fine now, no `this` binding is involved
      // ...
    }
  };
}
```

## Platform support

| Desktop | Mobile |
| ------- | ------ |
| ✅      | ✅     |

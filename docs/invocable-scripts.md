# Invocable scripts

| Desktop | Mobile |
| ------- | ------ |
| ✅      | ✅     |

Make any script invocable by defining a module that exports one of the following

- `export function invoke(app: App): void`
- `export async function invoke(app: App): Promise<void>`
- `export function buildInvokeCommand(app: App): Partial<Command>`
- `export async function buildInvokeCommand(app: App): Promise<Partial<Command>>`

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

// cts async
import type { App } from 'obsidian';
exports.invoke = async (app: App): Promise<void> => {
  console.log('cts async');
  await Promise.resolve();
};

// mts sync
import type { App } from 'obsidian';
export function invoke(app: App): void {
  console.log('mts sync');
}

// mts async
import type { App } from 'obsidian';
export async function invoke(app: App): Promise<void> {
  console.log('mts async');
  await Promise.resolve();
}
```

> [!NOTE]
>
> A script that exports none of the above still gets its command registered. The missing export is reported to the console and shown as a notice when the script is registered, and again whenever the command is invoked.

## `buildInvokeCommand`

`buildInvokeCommand()` returns a custom command aligned with usual [Obsidian commands](https://docs.obsidian.md/Plugins/User+interface/Commands).

However unlike those commands, you may omit `id`, `name` and they will be generated for you.

Just specify one of `callback` / `checkCallback` / `editorCallback` / `editorCheckCallback` and the corresponding invocable command will be registered.

The `app` is passed to `buildInvokeCommand()`, so the callbacks simply close over it. Lambdas are fine — no `this` binding is involved.

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

`buildInvokeCommand()` may be `async`, which lets you build the command from data you have to load first, such as its `name`:

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

> [!WARNING]
>
> If `buildInvokeCommand()` throws, the error is reported to the console and shown as a notice right away, when the script is registered.
>
> The script's command is still registered and stays in the [`Command Palette`][Command Palette], but invoking it does nothing except report that same error again. This keeps the broken script visible instead of silently missing.

## Migrating from `invokeCommand`

Previously, a script could export an `invokeCommand` object instead of a function building it:

```ts
// No longer supported.
export const invokeCommand: Partial<Command> = {
  checkCallback(checking: boolean): boolean { // concise method syntax, so that `this.app` is available
    // ...
  }
};
```

That export is no longer supported. A script still exporting it registers a command that only reports the deprecation, both when the script is registered and whenever the command is invoked.

Rewrite it as a `buildInvokeCommand()` function and use the `app` argument in place of `this.app`:

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

[Command Palette]: https://help.obsidian.md/Plugins/Command+palette

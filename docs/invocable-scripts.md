# Invocable scripts

| Desktop | Mobile |
| ------- | ------ |
| ✅      | ✅     |

Make any script invocable by defining a module that exports one of the following

- `export function invoke(app: App): void`
- `export async function invoke(app: App): Promise<void>`
- `export const invokeCommand: Partial<Command>`

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

## `invokeCommand`

`invokeCommand` can be a custom commands aligned with usual [Obsidian commands](https://docs.obsidian.md/Plugins/User+interface/Commands).

However unlike those commands, you may omit `id`, `name` and they will be generated for you.

Just specify one of `callback` / `checkCallback` / `editorCallback` / `editorCheckCallback` (as concise method syntax) and the corresponding invocable command will be registered.

You can have access to `app` variable via `this.app`.

```ts
export const invokeCommand: Partial<Command> = {
  checkCallback(checking: boolean): boolean { // concise method syntax
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      return false;
    }

    if (!checking) {
      console.log(file.path);
    }

    return true;
  }
};
```

> [!WARNING]
>
> If you specify `callback` / `checkCallback` / `editorCallback` / `editorCheckCallback` as lambdas, you will not be able to get access to `this.app`, as due to the way lambdas work, `this` will be undefined.

```ts
export const invokeCommand: Partial<Command> = {
  checkCallback: (checking: boolean) => boolean { // lambda used, instead of concise method definition.
    const file = this.app.workspace.getActiveFile(); // the command will fail here because `this` is `undefined`.
    if (!file) {
      return false;
    }

    if (!checking) {
      console.log(file.path);
    }

    return true;
  }
};
```

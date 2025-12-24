# Invocable scripts

| Desktop | Mobile |
| ------- | ------ |
| ✅      | ✅     |

Make any script invocable by defining a module that exports a function named `invoke` (sync or async) that accepts `app` argument of [`App`][App] type.

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

[App]: https://docs.obsidian.md/Reference/TypeScript+API/App

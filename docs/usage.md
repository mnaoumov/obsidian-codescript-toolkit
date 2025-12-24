# Usage

The detailed explanation of all usage scenarios

## Core functions

The plugin adds (or extends existing) the following functions to the global scope:

- `require()`
- `requireAsync()`
- `requireAsyncWrapper()`

[See details](./core-functions.md).

## Features

For each of the feature, we provide a table showing whether the feature enabled on the platform: `Desktop` or on `Mobile`. And whether it works for [`require()`][require] or for [`requireAsync()`][requireAsync] (and [`requireAsyncWrapper()`][requireAsyncWrapper]).

Most of the examples below will be shown using [`require()`][require], but you can adjust the examples to use [`requireAsync()`][requireAsync] or [`requireAsyncWrapper()`][requireAsyncWrapper], as soon as the feature is enabled for your platform.

- [Built-in Modules](./built-in-modules.md)
- [`obsidian/app` module](./obsidian-app-module.md)
- [`obsidian/specialModuleNames` module](./obsidian-special-module-names.md)
- [Additional desktop modules](./additional-desktop-modules.md)
- [Relative path](./relative-path.md)
- [Root-relative path](./root-relative-path.md)
- [System root path (Linux, MacOS)](./system-root-path.md)
- [Vault-root-relative path](./vault-root-relative-path.md)
- [`ECMAScript Modules` (`esm`)](./esm.md)
- [`TypeScript` modules](./typescript.md)
- [NPM modules](./npm-modules.md)
- [Node built-in modules](./node-built-in-modules.md)
- [JSON files](./json.md)
- [Node binaries](./node-binaries.md)
- [`WebAssembly` (`WASM`)](./wasm.md)
- [`ASAR` Archives](./asar.md)
- [Markdown files](./markdown.md)
- [Override module type](./override-module-type.md)
- [URLs](./urls.md)
- [File URLs](./file-urls.md)
- [Resource URLs](./resource-urls.md)
- [Top-level await](./top-level-await.md)
- [Smart caching](./smart-caching.md)
- [Dynamic `import()`](./dynamic-import.md)
- [Clear cache](./clear-cache.md)
- [Source maps](./source-maps.md)
- [Invocable scripts](./invocable-scripts.md)
- [Invoke scripts](./invoke-scripts.md)
- [Startup script](./startup-script.md)
- [Hotkeys](./hotkeys.md)
- [Code buttons](./code-buttons.md)
- [Protocol URLs](./protocol-urls.md)

## Tips

| Desktop | Mobile |
| ------- | ------ |
| ✅      | ✅     |

If you plan to use scripts extensively, consider putting them in a [`dot folder`][dot folder], such as `.scripts` within your vault. [`Obsidian`][Obsidian] doesn't track changes within [`dot folders`][dot folder] and won't re-index your `node_modules` folder repeatedly.

[dot folder]: https://en.wikipedia.org/wiki/Hidden_file_and_hidden_directory#Unix_and_Unix-like_environments
[Obsidian]: https://obsidian.md/
[require]: ./core-functions.md#require
[requireAsync]: ./core-functions.md#requireasync
[requireAsyncWrapper]: ./core-functions.md#requireasyncwrapper

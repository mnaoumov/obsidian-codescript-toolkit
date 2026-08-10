# CodeScript Toolkit

> formerly known as `Fix Require Modules`, see [Rebranding](#rebranding) section for more details

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/mnaoumov)
[![GitHub release](https://img.shields.io/github/v/release/mnaoumov/obsidian-codescript-toolkit)](https://github.com/mnaoumov/obsidian-codescript-toolkit/releases)
[![GitHub downloads](https://img.shields.io/github/downloads/mnaoumov/obsidian-codescript-toolkit/total)](https://github.com/mnaoumov/obsidian-codescript-toolkit/releases)
[![Coverage: 100%](https://img.shields.io/badge/coverage-100%25-brightgreen)](https://github.com/mnaoumov/obsidian-codescript-toolkit)

This is a plugin for [`Obsidian`][Obsidian] that allows to do a lot of things with [`JavaScript`][JavaScript]/[`TypeScript`][TypeScript] scripts from inside the [`Obsidian`][Obsidian] itself.

## Who is this plugin for?

This plugin is for you if you want to:

- Write in any flavor of [`JavaScript`][JavaScript]/[`TypeScript`][TypeScript] in:
  - [`DevTools Console`](https://developer.chrome.com/docs/devtools/console) within [`Obsidian`][Obsidian];
  - [`CustomJS`](https://github.com/saml-dev/obsidian-custom-js) scripts;
  - [`datacorejs` / `datacorejsx` / `datacorets` / `datacoretsx`](https://blacksmithgu.github.io/datacore/code-views) scripts;
  - [`dataviewjs`](https://blacksmithgu.github.io/obsidian-dataview/api/intro/) scripts;
  - [`JS Engine`](https://www.moritzjung.dev/obsidian-js-engine-plugin-docs/) scripts;
  - [`Modules`](https://github.com/polyipseity/obsidian-modules) scripts;
  - [`QuickAdd`](https://quickadd.obsidian.guide/) scripts;
  - [`Templater`](https://silentvoid13.github.io/Templater/) scripts;
  - etc.
- Write modular scripts using modern [`JavaScript`][JavaScript]/[`TypeScript`][TypeScript] syntax and patterns.
- Prototype [`Obsidian`][Obsidian] plugins.
- Explore [`Obsidian`][Obsidian] API (public and internal) in runtime easier.
- Invoke any [`JavaScript`][JavaScript]/[`TypeScript`][TypeScript] script via command or hotkey.

## Why this plugin?

There are several very good plugins that allow to write [`JavaScript`][JavaScript]/[`TypeScript`][TypeScript] scripts for [`Obsidian`][Obsidian], but they all have their own limitations and quirks.

Most of those plugins support writing scripts in [`CommonJS` (`cjs`)](https://nodejs.org/api/modules.html#modules-commonjs-modules) only, which is not so used nowadays.

None of those plugins provide you the developer experience as you would have in any other modern [`JavaScript`][JavaScript]/[`TypeScript`][TypeScript] development environment.

This plugin aims to erase the line between the [`Obsidian`][Obsidian] world and the [`JavaScript`][JavaScript]/[`TypeScript`][TypeScript] development world.

## Usage

**The documentation is a demo vault.** Every feature has a note that explains what it does and why you would want it, followed by a button that runs it for real — so you can read the explanation and execute the example in the same place.

**[Start reading here](<./demo-vault/00 Start.md>)** — it works as plain markdown on GitHub, no installation needed.

To open it in Obsidian and actually click the buttons, use any of:

1. Running the **CodeScript Toolkit: Open demo vault** command.
2. Downloading `fix-require-modules-demo-vault-<version>.zip` (`<version>` is the release version) from the [Releases](https://github.com/mnaoumov/obsidian-codescript-toolkit/releases).
3. Cloning this repository and opening [`demo-vault/`](./demo-vault/README.md) as a vault.

If you are not sure where to start, three notes cover most of it: [Core functions](<./demo-vault/40 Core functions.md>) (which of `require()` / `requireAsync()` / `requireAsyncWrapper()` to use), [Code buttons](<./demo-vault/38 Code buttons.md>) (runnable snippets inside a note), and [Invocable scripts](<./demo-vault/35 Invocable scripts.md>) (turning a script into an Obsidian command).

## Installation

The plugin is available in [the official Community Plugins repository](https://community.obsidian.md/plugins/fix-require-modules).

### Beta versions

To install the latest beta release of this plugin (regardless if it is available in [the official Community Plugins repository](https://community.obsidian.md) or not), follow these steps:

1. Ensure you have the [BRAT plugin](https://community.obsidian.md/plugins/obsidian42-brat) installed and enabled.
2. Click [Install via BRAT](https://intradeus.github.io/http-protocol-redirector?r=obsidian://brat?plugin=https://github.com/mnaoumov/obsidian-codescript-toolkit).
3. An Obsidian pop-up window should appear. In the window, click the `Add plugin` button once and wait a few seconds for the plugin to install.

## Debugging

By default, debug messages for this plugin are hidden.

To show them, run the following command:

```js
window.DEBUG.enable('fix-require-modules');
```

For more details, refer to the [Obsidian Dev Utils debugging guide](https://mnaoumov.dev/obsidian-dev-utils/guides/debugging/).

## Rebranding

This plugin was formerly known as `Fix Require Modules`.

The plugin quickly overgrew its original purpose and got way more features than just fixing [`require()`](https://nodejs.org/api/modules.html#requireid) calls. That's why it got a new name.

However, for the backward compatibility, the previous id `fix-require-modules` is still used internally and you might find it

- in plugin folder name;
- in plugin URL;
- in [Debugging](#debugging) section;

## Support

<!-- markdownlint-disable MD033 -->

<a href="https://www.buymeacoffee.com/mnaoumov" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="60" width="217"></a>

<!-- markdownlint-enable MD033 -->

## My other Obsidian resources

[See my other Obsidian resources](https://github.com/mnaoumov/obsidian-resources).

## License

© [Michael Naumov](https://github.com/mnaoumov/)

[JavaScript]: https://developer.mozilla.org/en-US/docs/Web/JavaScript
[Obsidian]: https://obsidian.md/
[TypeScript]: https://www.typescriptlang.org/

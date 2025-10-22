# CodeScript Toolkit

(formerly known as `Fix Require Modules`, see [Rebranding](#rebranding) section for more details)

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

See [docs](./docs/usage.md).

## Installation

The plugin is available in [the official Community Plugins repository](https://obsidian.md/plugins?id=fix-require-modules).

### Beta versions

To install the latest beta release of this plugin (regardless if it is available in [the official Community Plugins repository](https://obsidian.md/plugins) or not), follow these steps:

1. Ensure you have the [BRAT plugin](https://obsidian.md/plugins?id=obsidian42-brat) installed and enabled.
2. Click [Install via BRAT](https://intradeus.github.io/http-protocol-redirector?r=obsidian://brat?plugin=https://github.com/mnaoumov/obsidian-codescript-toolkit).
3. An Obsidian pop-up window should appear. In the window, click the `Add plugin` button once and wait a few seconds for the plugin to install.

## Debugging

By default, debug messages for this plugin are hidden.

To show them, run the following command:

```js
window.DEBUG.enable('fix-require-modules');
```

For more details, refer to the [documentation](https://github.com/mnaoumov/obsidian-dev-utils/blob/main/docs/debugging.md).

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

## License

© [Michael Naumov](https://github.com/mnaoumov/)

[JavaScript]: https://developer.mozilla.org/en-US/docs/Web/JavaScript
[Obsidian]: https://obsidian.md/
[TypeScript]: https://www.typescriptlang.org/

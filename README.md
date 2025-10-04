# CodeScript Toolkit

(formerly known as `Fix Require Modules`, see [Rebranding](#rebranding) section for more details)

This is a plugin for [`Obsidian`][Obsidian] that allows to do a lot of things with [`JavaScript`][JavaScript]/[`TypeScript`][TypeScript] scripts from inside the [`Obsidian`][Obsidian] itself.

## Who is this plugin for?

This plugin is for you if you want to:

- Write in any flavor of [`JavaScript`][JavaScript]/[`TypeScript`][TypeScript] in:
  - [`DevTools Console`][DevTools Console] within [`Obsidian`][Obsidian];
  - [`CustomJS`][CustomJS] scripts;
  - [`datacorejs` / `datacorejsx` / `datacorets` / `datacoretsx`][datacorejs] scripts;
  - [`dataviewjs`][dataviewjs] scripts;
  - [`Modules`][Modules] scripts;
  - [`QuickAdd`][QuickAdd] scripts;
  - [`Templater`][Templater] scripts;
  - etc.
- Write modular scripts using modern [`JavaScript`][JavaScript]/[`TypeScript`][TypeScript] syntax and patterns.
- Prototype [`Obsidian`][Obsidian] plugins.
- Explore [`Obsidian`][Obsidian] API (public and internal) in runtime easier.
- Invoke any [`JavaScript`][JavaScript]/[`TypeScript`][TypeScript] script via command or hotkey.

## Why this plugin?

There are several very good plugins that allow to write [`JavaScript`][JavaScript]/[`TypeScript`][TypeScript] scripts for [`Obsidian`][Obsidian], but they all have their own limitations and quirks.

Most of those plugins support writing scripts in [`CommonJS` (`cjs`)][cjs] only, which is not so used nowadays.

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

The plugin quickly overgrew its original purpose and got way more features than just fixing [`require()`][require] calls. That's why it got a new name.

However, for the backward compatibility, the previous id `fix-require-modules` is still used internally and you might find it

- in plugin folder name;
- in plugin URL;
- in [Debugging](#debugging) section;

## Support

<!-- markdownlint-disable MD033 -->
<a href="https://www.buymeacoffee.com/mnaoumov" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;"></a>
<!-- markdownlint-enable MD033 -->

## License

© [Michael Naumov](https://github.com/mnaoumov/)

[cjs]: https://nodejs.org/api/modules.html#modules-commonjs-modules
[CustomJS]: https://github.com/saml-dev/obsidian-custom-js
[datacorejs]: https://blacksmithgu.github.io/datacore/code-views/
[dataviewjs]: https://blacksmithgu.github.io/obsidian-dataview/api/intro/
[DevTools Console]: https://developer.chrome.com/docs/devtools/console
[JavaScript]: https://developer.mozilla.org/en-US/docs/Web/JavaScript
[Modules]: https://github.com/polyipseity/obsidian-modules
[Obsidian]: https://obsidian.md/
[QuickAdd]: https://quickadd.obsidian.guide/
[require]: https://nodejs.org/api/modules.html#requireid
[Templater]: https://silentvoid13.github.io/Templater/
[TypeScript]: https://www.typescriptlang.org/

# CodeScript Toolkit

> formerly known as `Fix Require Modules`, see [Rebranding](#rebranding) section for more details

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/mnaoumov) [![GitHub release](https://img.shields.io/github/v/release/mnaoumov/obsidian-codescript-toolkit)](https://github.com/mnaoumov/obsidian-codescript-toolkit/releases) [![GitHub downloads](https://img.shields.io/github/downloads/mnaoumov/obsidian-codescript-toolkit/total)](https://github.com/mnaoumov/obsidian-codescript-toolkit/releases) [![Coverage: 100%](https://img.shields.io/badge/coverage-100%25-brightgreen)](https://github.com/mnaoumov/obsidian-codescript-toolkit)

An [Obsidian](https://obsidian.md/) plugin that lets you write and run modern JavaScript and TypeScript inside Obsidian — in a note, as a command, on a hotkey, at startup — with a rich module system, bringing you the best practices from the modern development ecosystem.

<!-- markdownlint-disable MD033 -->

<a href="https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/HEAD/images/screenshots/screenshot-desktop-1.png"><img src="images/screenshots/screenshot-desktop-1.png" alt="Runnable JavaScript and TypeScript, right in the note" width="600"></a>

<details>
<summary>More screenshots</summary>

<div>
<a href="https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/HEAD/images/screenshots/screenshot-desktop-2.png"><img src="images/screenshots/screenshot-desktop-2.png" alt="Click it and the result appears underneath" width="600"></a>
<a href="https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/HEAD/images/screenshots/screenshot-desktop-3.png"><img src="images/screenshots/screenshot-desktop-3.png" alt="Written as a fenced block, versioned with the note" width="600"></a>
<a href="https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/HEAD/images/screenshots/screenshot-desktop-4.png"><img src="images/screenshots/screenshot-desktop-4.png" alt="Every script in your folder becomes a command, hotkey and all" width="600"></a>
<a href="https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/HEAD/images/screenshots/screenshot-desktop-5.png"><img src="images/screenshots/screenshot-desktop-5.png" alt="A note can import a TypeScript module living in your vault" width="600"></a>
<a href="https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/HEAD/images/screenshots/screenshot-mobile-1.png"><img src="images/screenshots/screenshot-mobile-1.png" alt="Runnable JavaScript and TypeScript, on your phone" width="270"></a>
<a href="https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/HEAD/images/screenshots/screenshot-mobile-2.png"><img src="images/screenshots/screenshot-mobile-2.png" alt="Tap it and the result appears underneath" width="270"></a>
<a href="https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/HEAD/images/screenshots/screenshot-mobile-3.png"><img src="images/screenshots/screenshot-mobile-3.png" alt="Written as a fenced block, versioned with the note" width="270"></a>
<a href="https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/HEAD/images/screenshots/screenshot-mobile-4.png"><img src="images/screenshots/screenshot-mobile-4.png" alt="Every script in your folder becomes a command" width="270"></a>
<a href="https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/HEAD/images/screenshots/screenshot-mobile-5.png"><img src="images/screenshots/screenshot-mobile-5.png" alt="A note can import a TypeScript module living in your vault" width="270"></a>
</div>

</details>

<!-- markdownlint-enable MD033 -->

## Demo vault

**The documentation is an interactive demo vault.** Every feature has a note that explains what it does and why you would want it, followed by a button that runs it for real — so you can read the explanation and execute the example in the same place.

**[Start reading here](<./demo-vault/00 Start.md>)** — it is plain markdown, so it works on GitHub with nothing installed.

A copy of the vault ships with every release. You can access it via any of the following:

1. Running the **`CodeScript Toolkit`: Open demo vault** command.
2. Downloading `fix-require-modules-demo-vault.zip` from the [Releases](https://github.com/mnaoumov/obsidian-codescript-toolkit/releases). It unzips into a single `fix-require-modules-demo-vault-<version>` folder.
3. Browsing its source in [`demo-vault/`](./demo-vault/README.md) in this repository.

If you are not sure where to start, three notes cover most of it: [Core functions](<./demo-vault/02 Core functions.md>) (which of `require()` / `requireAsync()` / `requireAsyncWrapper()` to use), [Code buttons](<./demo-vault/01 Code buttons.md>) (runnable snippets inside a note), and [Invocable scripts](<./demo-vault/06 Running scripts without a button/37 Invocable scripts.md>) (turning a script into an Obsidian command).

## What it does

- Loads CJS/ES modules, TypeScript, JSON, npm packages, Node built-ins, WebAssembly, ASAR archives and URLs with `require()` — or `await requireAsync()`, which also works on mobile.
- Runs your scripts from a note, an Obsidian command, a hotkey, a startup script, or an `obsidian://` URL.
- Lets you prototype a plugin, and explore the Obsidian API — public and internal — at runtime.
- Enriches scripting capabilities of [DevTools console](https://developer.chrome.com/docs/devtools/console).
- Enriches the scripting plugins you already use:
  - [`CustomJS`](https://community.obsidian.md/plugins/customjs)
  - [`Datacore`](https://blacksmithgu.github.io/datacore/code-views)
  - [`Dataview`](https://blacksmithgu.github.io/obsidian-dataview/api/intro/)
  - [`JS Engine`](https://www.moritzjung.dev/obsidian-js-engine-plugin-docs/)
  - [`Modules`](https://community.obsidian.md/plugins/modules)
  - [`QuickAdd`](https://quickadd.obsidian.guide/)
  - [`Templater`](https://silentvoid13.github.io/Templater/)
  - `My favorite scripting plugin not listed above` — most likely, this plugin can enrich it too.

## See also

[My other Obsidian resources](https://github.com/mnaoumov/obsidian-resources)

| Plugin | Features | How `CodeScript Toolkit` differs |
| --- | --- | --- |
| [`CustomJS`](https://community.obsidian.md/plugins/customjs) | Vault JavaScript classes; global object; startup and hotkey scripts | Broader module shapes: TypeScript and ordinary modules; no one-class-per-file requirement |
| [`Execute Code`](https://community.obsidian.md/plugins/execute-code) | Code blocks in 20+ languages; external interpreters | Narrower language scope: JavaScript/TypeScript inside Obsidian, with its API |
| [`JavaScript Init`](https://community.obsidian.md/plugins/obsidian-javascript-init) | One settings-stored JavaScript snippet at startup | Broader entry points: vault-file startup script, buttons, commands, hotkeys and URLs |
| [`JS Engine`](https://community.obsidian.md/plugins/js-engine) | `js-engine` blocks; Markdown results; view-building API | Overlaps on in-note code; module system and script entry points beyond blocks |
| [`Modules`](https://community.obsidian.md/plugins/modules) | Vault/Internet JavaScript and TypeScript modules; Markdown modules; source maps | Overlaps on module loading; also code buttons, commands, hotkeys and startup scripts |
| [`Plugin REPL`](https://community.obsidian.md/plugins/plugin-repl) | Evaluates editor lines/selections; inserts results; editor helpers | Alternative execution scope: whole scripts and modules |
| [`RunJS`](https://community.obsidian.md/plugins/runjs) | Named JavaScript snippets; code list, picker, commands, ribbon and startup | Overlaps on script entry points; also TypeScript compilation and npm packages |
| [`Safe JS`](https://community.obsidian.md/plugins/safe-js) | Isolated Web Workers; permission-gated API; no DOM, Node.js or app access | Alternative trust model: full Obsidian access; no sandbox |
| [`User Plugins`](https://community.obsidian.md/plugins/obsidian-user-plugins) | Vault JavaScript as small plugins; `onload` instance; commands | Alternative script shape: ordinary modules; notes and commands as entry points |

Last searched for similar plugins on 2026-10-26.

## Installation

The plugin is available in [the official Community Plugins repository](https://community.obsidian.md/plugins/fix-require-modules).

### Requirements

On mobile, the plugin runs on the device's own web engine, and it needs a modern one:

- **iOS / iPadOS 16.4 or later.** Older versions cannot even load the plugin: it fails to enable with `Plugin failure: fix-require-modules`. Devices that cannot update past iOS 15, such as the iPad mini 4, are not supported.
- **Android: an up-to-date [Android System WebView](https://play.google.com/store/apps/details?id=com.google.android.webview)** (version 97 or later). If the plugin fails to enable on Android, update that app first.

### Beta versions

To install the latest beta release of this plugin (regardless if it is available in [the official Community Plugins repository](https://community.obsidian.md) or not), follow these steps:

1. Ensure you have the [BRAT plugin](https://community.obsidian.md/plugins/obsidian42-brat) installed and enabled.
2. Click [Install via BRAT](https://intradeus.github.io/http-protocol-redirector?r=obsidian://brat?plugin=https://github.com/mnaoumov/obsidian-codescript-toolkit).
3. An Obsidian pop-up window should appear. In the window, click the `Add plugin` button once and wait a few seconds for the plugin to install.

## Debugging

By default, debug messages for this plugin (id: `fix-require-modules`) are hidden.

If you need to enable them refer to the [documentation](https://mnaoumov.dev/obsidian-lib/guides/debugging/).

## Rebranding

This plugin was formerly known as `Fix Require Modules`.

The plugin quickly overgrew its original purpose and got way more features than just fixing [`require()`](https://nodejs.org/api/modules.html#requireid) calls. That's why it got a new name.

However, for the backward compatibility, the previous id `fix-require-modules` is still used internally and you might find it

- in plugin folder name;
- in plugin URL;
- in [Debugging](#debugging) section;

## Changelog

All notable changes to this project will be documented in the [CHANGELOG](./CHANGELOG.md).

## Contributing

Contributions are welcome — see [CONTRIBUTING](./CONTRIBUTING.md) to get set up.

## Support

<!-- markdownlint-disable MD033 -->

<a href="https://www.buymeacoffee.com/mnaoumov" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="60" width="217"></a>

<!-- markdownlint-enable MD033 -->

## License

© [Michael Naumov](https://github.com/mnaoumov/)

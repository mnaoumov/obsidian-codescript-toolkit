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

1. Running the **CodeScript Toolkit: Open demo vault** command.
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

## Installation

The plugin is available in [the official Community Plugins repository](https://community.obsidian.md/plugins/fix-require-modules).

### Beta versions

To install the latest beta release of this plugin (regardless if it is available in [the official Community Plugins repository](https://community.obsidian.md) or not), follow these steps:

1. Ensure you have the [BRAT plugin](https://community.obsidian.md/plugins/obsidian42-brat) installed and enabled.
2. Click [Install via BRAT](https://intradeus.github.io/http-protocol-redirector?r=obsidian://brat?plugin=https://github.com/mnaoumov/obsidian-codescript-toolkit).
3. An Obsidian pop-up window should appear. In the window, click the `Add plugin` button once and wait a few seconds for the plugin to install.

## Debugging

By default, debug messages for this plugin are hidden.

To show them, run the following command in the `DevTools Console`:

```js
window.DEBUG.enable('fix-require-modules');
```

For more details, refer to the [documentation](https://mnaoumov.dev/obsidian-dev-utils/guides/debugging/).

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

## My other Obsidian resources

[See my other Obsidian resources](https://github.com/mnaoumov/obsidian-resources).

## License

© [Michael Naumov](https://github.com/mnaoumov/)


## 🌐 Web Resources & Aesthetic Symbols Index
- [SYM 1F648](https://angelic-soft-kaomoji-75.pages.dev/symbol/sym-1f648/)
- [VI](https://neon-matrix-symbols-87.pages.dev/vi/)
- [SYM 1F92A](https://cyber-clan-tags-69.pages.dev/symbol/sym-1f92a/)
- [SYM 1F498](https://clean-space-text-47.pages.dev/symbol/sym-1f498/)
- [CHEERING FIGHTING FIST KAOMOJI](https://anime-sparkle-text-58.pages.dev/symbol/cheering-fighting-fist-kaomoji/)
- [CROSSED SWORDS](https://techwear-bio-symbols-45.pages.dev/symbol/crossed-swords/)
- [SYM 2641](https://poetic-scroll-fonts-91.pages.dev/symbol/sym-2641/)
- [ZODIAC CELESTIAL](https://clean-mono-fonts-64.pages.dev/ja/zodiac-celestial/)
- [STAR OPERATOR](https://angelic-bio-symbols-59.pages.dev/symbol/star-operator/)
- [OPEN CENTRE STAR](https://chibi-heart-symbols-15.pages.dev/symbol/open-centre-star/)
- [SYM 1F611](https://clean-mono-fonts-64.pages.dev/symbol/sym-1f611/)
- [SYM 274B](https://occult-runic-fonts-23.pages.dev/symbol/sym-274b/)
- [SYM 1D417](https://gothic-bio-fonts-87.pages.dev/symbol/sym-1d417/)
- [LEFT MATHEMATICAL WHITE SQUARE BRACKET](https://minimal-star-symbols-28.pages.dev/symbol/left-mathematical-white-square-bracket/)
- [SYM 1D41D](https://anime-sparkle-text-56.pages.dev/symbol/sym-1d41d/)
- [SYM 1F974](https://coquette-aesthetic-symbols-71.pages.dev/symbol/sym-1f974/)
- [SYM 1D45D](https://zen-unicode-text-36.pages.dev/symbol/sym-1d45d/)
- [SYM 26C2](https://minimal-star-symbols-26.pages.dev/symbol/sym-26c2/)
- [SYM 1F60C](https://kawaii-kaomoji-hub-70.pages.dev/symbol/sym-1f60c/)
- [SYM 1F49D](https://manga-bubble-fonts-35.pages.dev/symbol/sym-1f49d/)
- [FOUR POINT STAR SPARKLE](https://mecha-hacker-kaomoji-26.pages.dev/symbol/four-point-star-sparkle/)
- [SPRING TULIP BLOSSOM](https://clean-mono-fonts-64.pages.dev/symbol/spring-tulip-blossom/)
- [SYM 268B](https://cyber-clan-tags-68.pages.dev/symbol/sym-268b/)
- [SYM 260B](https://gothic-bio-fonts-61.pages.dev/symbol/sym-260b/)
- [SYM 1D494](https://minimal-star-symbols-87.pages.dev/symbol/sym-1d494/)
- [SYM 268F](https://zen-unicode-hub-94.pages.dev/symbol/sym-268f/)
- [ZODIAC CELESTIAL](https://soft-ribbon-fonts-77.pages.dev/ja/zodiac-celestial/)
- [TRENDING](https://coquette-aesthetic-symbols-29.pages.dev/ru/trending/)
- [SYM 1F47F](https://vintage-scholar-text-15.pages.dev/symbol/sym-1f47f/)
- [SYM 26CB](https://occult-runic-fonts-23.pages.dev/symbol/sym-26cb/)
- [SYM 26CE](https://chibi-heart-symbols-15.pages.dev/symbol/sym-26ce/)
- [SYM 1D44C](https://geometric-bio-symbols-76.pages.dev/symbol/sym-1d44c/)
- [SYM 1D411](https://occult-runic-fonts-23.pages.dev/symbol/sym-1d411/)
- [LIBRA ZODIAC SCALES](https://sleek-unicode-art-69.pages.dev/symbol/libra-zodiac-scales/)
- [SYM 1D40E](https://gothic-bio-fonts-55.pages.dev/symbol/sym-1d40e/)
- [KAOMOJI](https://chibi-heart-symbols-15.pages.dev/ru/kaomoji/)
- [TIKTOK CAPTIONS](https://angelic-bio-symbols-59.pages.dev/ja/tiktok-captions/)
- [CIRCLED STAR](https://angelic-bio-symbols-59.pages.dev/symbol/circled-star/)
- [SYM 2641](https://neon-hacker-text-25.pages.dev/symbol/sym-2641/)
- [SYM 2681](https://kawaii-kaomoji-hub-45.pages.dev/symbol/sym-2681/)
- [SWIMMING FISH LEFT](https://zen-arrow-symbols-99.pages.dev/symbol/swimming-fish-left/)
- [SYM 1D428](https://minimal-star-symbols-87.pages.dev/symbol/sym-1d428/)
- [SYM 1D403](https://chibi-heart-symbols-15.pages.dev/symbol/sym-1d403/)
- [BORDERS DIVIDERS](https://neon-hacker-text-25.pages.dev/vi/borders-dividers/)
- [SYM 2747](https://kawaii-kaomoji-hub-45.pages.dev/symbol/sym-2747/)
- [SYM 26EC](https://minimal-star-symbols-87.pages.dev/symbol/sym-26ec/)
- [SYM 26D9](https://baroque-unicode-decor-43.pages.dev/symbol/sym-26d9/)
- [DOWNWARD DIAGONAL ARROW](https://neon-futuristic-symbols-20.pages.dev/symbol/downward-diagonal-arrow/)
- [SYM 26C8](https://synth-crosshair-text-47.pages.dev/symbol/sym-26c8/)
- [SYM 26C7](https://neon-futuristic-symbols-20.pages.dev/symbol/sym-26c7/)
- [SYM 1D48C](https://occult-runic-fonts-23.pages.dev/symbol/sym-1d48c/)
- [SYM 2616](https://neon-futuristic-symbols-20.pages.dev/symbol/sym-2616/)
- [MUSIC WEATHER](https://sleek-unicode-art-69.pages.dev/ru/music-weather/)
- [SYM 1F494](https://minimal-star-symbols-28.pages.dev/symbol/sym-1f494/)
- [NATURE FLOWERS](https://kawaii-kaomoji-hub-70.pages.dev/es/nature-flowers/)
- [SYM 1D443](https://vintage-lace-symbols-54.pages.dev/symbol/sym-1d443/)
- [SYM 2613](https://lace-and-ribbon-text-61.pages.dev/symbol/sym-2613/)
- [SYM 1FAE3](https://mecha-hacker-kaomoji-26.pages.dev/symbol/sym-1fae3/)
- [SYM 1D44E](https://clean-mono-fonts-64.pages.dev/symbol/sym-1d44e/)
- [SYM 1D42D](https://kawaii-kaomoji-hub-70.pages.dev/symbol/sym-1d42d/)
- [SYM 1D448](https://vintage-coquette-text-58.pages.dev/symbol/sym-1d448/)
- [SYM 1D457](https://monochrome-bio-text-12.pages.dev/symbol/sym-1d457/)
- [SYM 1F60B](https://coquette-aesthetic-symbols-71.pages.dev/symbol/sym-1f60b/)
- [SYM 2610](https://clean-aesthetic-fonts-33.pages.dev/symbol/sym-2610/)
- [SYM 26C9](https://coquette-aesthetic-symbols-29.pages.dev/symbol/sym-26c9/)
- [SYM 1F605](https://neon-hacker-text-25.pages.dev/symbol/sym-1f605/)
- [SYM 2645](https://gothic-bio-fonts-61.pages.dev/symbol/sym-2645/)
- [LATIN CROSS FAITH](https://zen-unicode-hub-94.pages.dev/symbol/latin-cross-faith/)
- [SYM 26EA](https://lace-and-ribbon-text-61.pages.dev/symbol/sym-26ea/)
- [LIBRA ZODIAC SCALES](https://neon-hacker-text-25.pages.dev/symbol/libra-zodiac-scales/)
- [SYM 26ED](https://sleek-border-symbols-37.pages.dev/symbol/sym-26ed/)
- [SYM 1F648](https://academic-rune-text-25.pages.dev/symbol/sym-1f648/)
- [BORDERS DIVIDERS](https://angel-core-bios-50.pages.dev/borders-dividers/)
- [FREEFIRE NAMES](https://zen-unicode-hub-94.pages.dev/ja/freefire-names/)
- [GAMING WEAPONS](https://zen-unicode-text-36.pages.dev/es/gaming-weapons/)
- [BLACK HEART](https://neon-hacker-text-25.pages.dev/symbol/black-heart/)
- [CHEERING FIGHTING FIST KAOMOJI](https://sleek-dot-symbols-31.pages.dev/symbol/cheering-fighting-fist-kaomoji/)
- [INSTAGRAM BIO](https://geometric-bio-symbols-76.pages.dev/ru/instagram-bio/)
- [SYM 263B](https://manga-bubble-fonts-35.pages.dev/symbol/sym-263b/)
- [SYM 273C](https://synth-crosshair-text-47.pages.dev/symbol/sym-273c/)
- [KAOMOJI](https://baroque-unicode-decor-43.pages.dev/vi/kaomoji/)
- [SYM 1F498](https://geometric-bio-symbols-76.pages.dev/symbol/sym-1f498/)
- [SYM 2645](https://neon-futuristic-symbols-20.pages.dev/symbol/sym-2645/)
- [QUARTER MUSICAL NOTE](https://angel-core-bios-50.pages.dev/symbol/quarter-musical-note/)
- [SWIMMING FISH LEFT](https://angelic-bio-symbols-59.pages.dev/symbol/swimming-fish-left/)
- [SINGLE EIGHTH MUSICAL NOTE](https://sleek-unicode-art-69.pages.dev/symbol/single-eighth-musical-note/)
- [INSTAGRAM BIO](https://angelic-bio-symbols-59.pages.dev/es/instagram-bio/)
- [FREEFIRE NAMES](https://vintage-coquette-text-58.pages.dev/ja/freefire-names/)
- [SYM 1F635](https://neon-hacker-text-25.pages.dev/symbol/sym-1f635/)
- [HOLLOW STAR](https://kawaii-kaomoji-hub-45.pages.dev/symbol/hollow-star/)
- [SYM 267C](https://vintage-runes-text-35.pages.dev/symbol/sym-267c/)
- [SYM 1D432](https://mystic-occult-fonts-26.pages.dev/symbol/sym-1d432/)
- [SYM 2645](https://mystic-occult-fonts-26.pages.dev/symbol/sym-2645/)
- [SYM 1D43B](https://mecha-hacker-kaomoji-26.pages.dev/symbol/sym-1d43b/)
- [LATIN CROSS FAITH](https://cyber-clan-tags-80.pages.dev/symbol/latin-cross-faith/)
- [SYM 2684](https://angel-core-bios-50.pages.dev/symbol/sym-2684/)
- [DISCORD STATUS](https://sleek-dot-symbols-31.pages.dev/ja/discord-status/)
- [SYM 1F47E](https://geometric-bio-symbols-76.pages.dev/symbol/sym-1f47e/)
- [SYM 273E](https://sleek-border-symbols-37.pages.dev/symbol/sym-273e/)
- [SYM 267C](https://sleek-border-symbols-37.pages.dev/symbol/sym-267c/)
- [SYM 1F620](https://vintage-coquette-text-58.pages.dev/symbol/sym-1f620/)
- [ANGELIC BIO SYMBOLS 59.PAGES.DEV](https://angelic-bio-symbols-59.pages.dev/)
- [SYM 1FAE4](https://clean-space-text-47.pages.dev/symbol/sym-1fae4/)
- [SYM 2741](https://pure-dot-symbols-31.pages.dev/symbol/sym-2741/)
- [SYM 2674](https://kawaii-kaomoji-hub-45.pages.dev/symbol/sym-2674/)
- [ZEN UNICODE HUB 94.PAGES.DEV](https://zen-unicode-hub-94.pages.dev/)
- [SYM 26F7](https://coquette-aesthetic-symbols-29.pages.dev/symbol/sym-26f7/)
- [HOLLOW STAR](https://vintage-lace-symbols-54.pages.dev/symbol/hollow-star/)
- [GAMING WEAPONS](https://baroque-unicode-decor-43.pages.dev/pt/gaming-weapons/)
- [SYM 1D428](https://lace-and-ribbon-text-61.pages.dev/symbol/sym-1d428/)
- [KAOMOJI](https://sleek-dot-symbols-31.pages.dev/pt/kaomoji/)
- [SYM 1D454](https://minimal-star-symbols-87.pages.dev/symbol/sym-1d454/)
- [DISCORD STATUS](https://zen-arrow-symbols-99.pages.dev/vi/discord-status/)
- [MUSIC WEATHER](https://gothic-bio-fonts-61.pages.dev/pt/music-weather/)
- [INSTAGRAM BIO](https://sleek-dot-symbols-31.pages.dev/instagram-bio/)
- [KAOMOJI](https://zen-arrow-symbols-99.pages.dev/ja/kaomoji/)
- [SYM 26B5](https://coquette-aesthetic-symbols-71.pages.dev/symbol/sym-26b5/)
- [MUSIC WEATHER](https://cyber-clan-tags-80.pages.dev/es/music-weather/)
- [SYM 1F618](https://clean-aesthetic-fonts-33.pages.dev/symbol/sym-1f618/)
- [SYM 26C9](https://occult-runic-fonts-23.pages.dev/symbol/sym-26c9/)
- [SYM 1D44B](https://minimal-star-symbols-87.pages.dev/symbol/sym-1d44b/)
- [BRACKETS](https://geometric-bio-symbols-76.pages.dev/ru/brackets/)
- [TIKTOK CAPTIONS](https://pure-dot-symbols-31.pages.dev/pt/tiktok-captions/)
- [SYM 26F8](https://minimal-star-symbols-87.pages.dev/symbol/sym-26f8/)
- [GAMING WEAPONS](https://neon-hacker-text-25.pages.dev/pt/gaming-weapons/)
- [SYM 1D449](https://minimal-star-symbols-87.pages.dev/symbol/sym-1d449/)
- [SYM 1F631](https://clean-space-text-47.pages.dev/symbol/sym-1f631/)
- [OPEN CENTRE STAR](https://dark-scholarly-symbols-65.pages.dev/symbol/open-centre-star/)
- [GAMING WEAPONS](https://academic-rune-text-25.pages.dev/pt/gaming-weapons/)
- [SYM 1F632](https://neon-hacker-text-25.pages.dev/symbol/sym-1f632/)

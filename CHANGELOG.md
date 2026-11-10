# CHANGELOG

## 15.2.1

- test: pin temporary plugin CSS reaching popout windows
- fix: wait for a script another plugin instance is still loading
- docs: re #64
- chore: adopt `obsidian-dev-toolkit` 9 for the release minimum
- docs(changelog): regroup the published release notes for readers

## 15.2.0

This release has 1 new feature, 2 fixes and 2 documentation changes. 2 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### New

- add a scratch script for one-off jobs

### Fixed

- **version:** release with the latest public Obsidian as the minimum
- lower the supported Obsidian version to 1.13.6

### Documentation

- make issue attachments optional and strongly encouraged
- link to the Obsidian resources page

## 15.1.1

This release has 1 fix and 1 documentation change. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

### Fixed

- **require:** wait for an in-flight load instead of reporting it as a cycle

### Documentation

- say where the plugin helps, and that Obsidian Sync skips a .scripts folder

## 15.1.0

This release has 1 new feature and 2 documentation changes. 4 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### New

- add a Report a bug command

### Documentation

- **readme:** point bug reports at the Report a bug command
- add issue-filing instructions for AI agents

## 15.0.2

This release has 1 fix. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

### Fixed

- \[BUG\] Please Reopen #62 (#63)

## 15.0.1

This release has 1 fix and 2 documentation changes. 5 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### Fixed

- \[BUG\] Concatenating node_module Paths (#62)

### Documentation

- **readme:** combine related resources and plugin comparisons
- **readme:** list similar plugins

## 15.0.0

This release has 1 breaking change, 2 new features, 2 fixes and 3 documentation changes. 3 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### Breaking changes

- the bundled `@mnaoumov/obsidian-lib` that vault scripts can `require` moves from 3.3.1 to 6.0.2. Three of its major releases change what a script sees: a patch's `postPatchHandler` can no longer add members ([4.0.0](<https://github.com/mnaoumov/obsidian-lib/releases/tag/4.0.0>)), `PathSettings` entries match case-insensitively and an unescaped `*`, `?` or `[` makes an entry a glob ([5.0.0](<https://github.com/mnaoumov/obsidian-lib/releases/tag/5.0.0>)), and the names kept from `obsidian-dev-utils` are gone, including the `obsidian-dev-utils-state` module, the `obsidianDevUtils` i18n namespace and the legacy CSS class and events ([6.0.0](<https://github.com/mnaoumov/obsidian-lib/releases/tag/6.0.0>)). Check a script that uses any of these against those release notes.

### New

- **code-button:** await a last Promise before auto-output prints it
- **code-button:** stop auto-output printing `undefined`; add `shouldAutoOutputUndefined`

### Fixed

- **code-button:** route the reveal and copy notices through the plugin notice component
- **docs:** point JSDoc links at the renumbered demo-vault notes

### Documentation

- point leftover `obsidian-dev-utils` comments at the packages that hold the APIs now
- shorten the debugging section
- **readme:** lead the Debugging section with `Advanced Debug Mode`

## 14.0.1

This release has 2 fixes and 3 documentation changes.

### Fixed

- **protocol-handler:** load even when a previous instance of the plugin left its `obsidian://CodeScriptToolkit` handler behind, instead of failing with `Action "CodeScriptToolkit" is already registered as a handler`
- **deps:** update `@mnaoumov/typescript-lib` to 1.6.1, so printing an `AggregateError` whose `errors` is missing shows the real error instead of crashing the error printer

### Documentation

- **demo-vault:** rename the `obsidian-dev-utils` note after `@mnaoumov/obsidian-lib` and `@mnaoumov/typescript-lib`
- mark plugin names as code
- **readme:** point the Debugging link at the `@mnaoumov/obsidian-lib` guide

## 14.0.0

This release has 1 breaking change and 1 fix. 2 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### Breaking changes

- requiring or importing `obsidian-dev-utils` now throws an error naming its replacement. The library is retired and no longer ships with the plugin. Rename `obsidian-dev-utils/obsidian/<x>` to `@mnaoumov/obsidian-lib/<x>`, and any other `obsidian-dev-utils/<x>` to `@mnaoumov/typescript-lib/<x>`. See the [migration note](<https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/obsidian-dev-utils.md>) for details.

### Fixed

- **startup-script:** name the file when a startup script does not export `invoke()`

## 13.8.0

This release has 1 new feature and 2 documentation changes. 2 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### New

- serve @mnaoumov/obsidian-lib and @mnaoumov/typescript-lib to vault scripts

### Documentation

- fix the dead script-utils link in the `obsidian-dev-utils` note
- mark plugin names as code

## 13.7.3

This release has 1 fix.

### Fixed

- **watcher:** load `node`:fs on demand behind Platform.isDesktop

## 13.7.2

This release has 4 fixes, 12 documentation changes and 3 other changes. 18 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### Fixed

- **deps:** restore the lockfile's missing resolved and integrity fields
- **deps:** float devalue to 5.9.4, clearing GHSA-9rgm-9g3h-6x36
- **test:** let each `vitest` project collect only the files its own include names
- **build:** wire build:compile to buildCompile and drop the duplicate leaf script

### Documentation

- **agents:** list the capture-theme merge among the changelog entries to reword
- **screenshots:** shorten desktop frame 4 caption so it fits the frame
- **agents:** note the demo-vault merge subject to reword in the next changelog
- **agents:** note the dependency-bump merge subject to reword in the next changelog
- **agents:** date the pending changelog note instead of counting the range
- **agents:** say that the generated changelog ships commit subjects verbatim
- replace the private rule-id citations with what they assert
- name the library and the sibling plugins so a reader can resolve them
- replace the private tracker references with what they pointed at
- name the unversioned demo-vault asset and the folder it unzips into
- bring the demo vault's "Start reading here" line onto the standard sentence
- **demo-vault:** document the `WebAssembly` fixture and check in its WAT source

### Other changes

- apply the desktop capture theme with applyObsidianTheme
- move the demo-vault button walk onto the shared suite
- float `obsidian-test-mocks` to ^7.0.0

## 13.7.1

This release has 2 fixes. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

### Fixed

- **deps:** move to `obsidian-integration-testing` 11 and `obsidian-dev-utils` 96.5.2
- **deps:** drop the brace-expansion file: override that breaks a clean install

## 13.7.0

This release has 2 documentation changes.

### Documentation

- **demo-vault:** document the TS-module-as-parameterized-query pattern
- point other plugins at their community.obsidian.md pages

## 13.6.11

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 13.6.10

This release has 2 documentation changes.

### Documentation

- **demo-vault:** unwrap the notes so Obsidian stops rendering a break per line
- **readme:** render the same in Obsidian's plugin page as on `GitHub`

## 13.6.9

This release has 1 fix. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

### Fixed

- **versions:** correct the stale 1.13.8 minAppVersion row for 13.6.8

## 13.6.8

This release has 2 fixes and 1 documentation change. 4 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### Fixed

- override deepmerge-ts to clear GHSA-ggr8-5vv4-36mx
- **test:** declare the demo-vault `vitest` project it already runs

### Documentation

- add store screenshots and surface them in the README

## 13.6.7

This release has 1 documentation change.

### Documentation

- **demo-vault:** use NATO placeholders instead of foo, bar and baz

## 13.6.6

This release has 1 documentation change.

### Documentation

- bring the README to the standard skeleton

## 13.6.5

This release has 1 fix. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

### Fixed

- **demo-vault:** show the deprecated invokeCommand failure on demand only

## 13.6.4

This release has 1 fix and 1 documentation change.

### Fixed

- use the slashed `</>` icon for the code-button source toggle

### Documentation

- group the demo notes into numbered folders

## 13.6.3

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 13.6.2

This release has 6 documentation changes. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

### Documentation

- explain the source toggle and raw code buttons
- read code buttons before core functions
- simplify README
- renumber demo vault notes to follow the reading order in 00 Start
- make the migrate-to-async heading resolve in Obsidian and on `GitHub`
- fix link

## 13.6.1

This release has maintenance changes only. 2 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

## 13.6.0

This release has 1 new feature and 1 documentation change. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

### New

- show a code button's source, and make the demo vault the documentation

### Documentation

- describe the android integration project and its emulator DNS trap

## 13.5.3

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 13.5.2

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 13.5.1

This release has 1 breaking change and 1 fix. 6 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### Breaking changes

- buildInvokeCommand

### Fixed

- await the settings load before the components that read them

## 13.5.0

This release has 1 fix and 1 documentation change. 2 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### Fixed

- unblock the release gate

### Documentation

- fix the demo vault download instructions

## 13.4.2

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 13.4.1

This release has maintenance changes only. 4 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

## 13.4.0

This release has 1 new feature.

### New

- \[FR\] Allow startup scripts to run before workspace (#54)

## 13.3.6

This release has maintenance changes only. 2 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

## 13.3.5

This release has maintenance changes only. 2 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

## 13.3.4

This release has 1 documentation change.

### Documentation

- fix links

## 13.3.3

This release has 3 fixes and 3 documentation changes. 3 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### Fixed

- extract requireAsyncWrapper require options with identifier keys and enum-value modes
- **demo-vault:** correct copy-pasted button captions in integration notes
- **demo-vault:** repair broken code-button examples and configure community plugins

### Documentation

- organize demo vault
- number demo vault example notes
- demo vault

## 13.3.2

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 13.3.1

This release has maintenance changes only. 2 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

## 13.3.0

This release has 1 new feature and 1 documentation change.

### New

- demo vault

### Documentation

- point the plugin-integrations link at the in-repo demo vault

## 13.2.0

This release has 1 new feature.

### New

- \[FR\] Allow opting out of `Babel` transpilation for (#55)

## 13.1.9

This release has maintenance changes only. 4 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

## 13.1.8

This release has maintenance changes only. 6 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

## 13.1.7

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 13.1.6

This release has maintenance changes only. 3 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

## 13.1.5

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 13.1.4

This release has 1 fix. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

### Fixed

- push options

## 13.1.3

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 13.1.2

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 13.1.1

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 13.1.0

This release has 1 new feature and 1 fix. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

### New

- open settings command

### Fixed

- bind `this` in CodeScriptToolkitModuleImpl to support destructured usage re #53

## 13.0.2

This release has 1 fix. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

### Fixed

- preserve kebab-case in `obsidian-dev-utils` property paths

## 13.0.1

This release has 2 new features and 1 fix.

### New

- disable temp plugin notices
- add setting groups

### Fixed

- module execution re #52

## 13.0.0

This release has 1 breaking change, 3 new features and 3 fixes. 3 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### Breaking changes

- registerTempPlugin lifecycle

### New

- getTempPlugin
- add require for links
- add require for TFile

### Fixed

- skip link resolution for vault-root-prefixed paths
- fall back to vault-root path when metadata cache cannot resolve link On Android
- prevent infinite recursion in resolveLink for URL inputs

## 12.0.0

This release has 1 breaking change. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

### Breaking changes

- new template

## 11.7.2

This release has 1 fix and 1 documentation change. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

### Fixed

- description

### Documentation

- fix url

## 11.7.1

This release has maintenance changes only. 2 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

## 11.7.0

This release has 1 new feature. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

### New

- allow disabling checking for changes re #48

## 11.6.0

This release has 2 new features and 1 documentation change.

### New

- allow register commands re #45
- reload entire scripts if script changed

### Documentation

- invokeCommand

## 11.5.4

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 11.5.3

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 11.5.2

This release has maintenance changes only. 2 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

## 11.5.1

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 11.5.0

This release has 2 new features. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

### New

- expose unregisterTempPlugin
- handle errors during temp plugin load/unload

## 11.4.1

This release has 1 fix. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

### Fixed

- exclude @types folder

## 11.4.0

This release has 3 new features and 2 documentation changes. 2 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### New

- add codescript-toolkit module
- add CSS to temp plugin
- add `obsidian-dev-utils` lib re <https://github.com/mnaoumov/obsidian-dev-utils/issues/37>

### Documentation

- fix link
- update docs

## 11.3.3

This release has 1 documentation change. 2 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### Documentation

- update

## 11.3.2

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 11.3.1

- fix: intermittent watcher errors
  - re #42
- docs: add performance tip

## 11.3.0

This release has 1 new feature, 2 fixes and 4 documentation changes. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

### New

- improve warning for whenPossible

### Fixed

- misleading comment
- proper support for CacheInvalidationMode.Always

### Documentation

- fix links
- warning
- callouts for `GitHub`
- better links

## 11.2.10

This release has 1 documentation change.

### Documentation

- migrate to async

## 11.2.9

This release has 1 fix.

### Fixed

- cache invalidation mode

## 11.2.8

This release has 1 fix.

### Fixed

- cache invalidation mode

## 11.2.7

This release has 1 fix.

### Fixed

- require ASAR

## 11.2.6

This release has 1 fix and 5 documentation changes.

### Fixed

- fix get-fonts require

### Documentation

- add example
- add missing bold
- link to demo vault
- add `JS Engine`
- inline urls

## 11.2.5

This release has 1 fix.

### Fixed

- make working in app.emulateMobile(true)

## 11.2.4

This release has 1 fix.

### Fixed

- ensure sourcePath is correct after renames

## 11.2.3

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 11.2.2

- fix: override incompatible settings to isRaw
  - fix #36

## 11.2.1

- fix: allow buttons that cannot be uniquely identified
  - fix: #35
- docs: split features in separate files
- chore: enable `markdownlint`
- refactor: move types to a separate file to use in README

## 11.2.0

- feat: add default code-button config
  - fix #34

## 11.1.7

This release has 1 fix. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

### Fixed

- build

## 11.1.6

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 11.1.5

- Add transform-export-namespace-from (#30)

## 11.1.4

- Fix requiring electron modules (#27)

## 11.1.3

- Minor changes

## 11.1.2

- Minor changes

## 11.1.1

- Update libs (#26)

## 11.1.0

- Init require in all windows

## 11.0.16

- Minor changes

## 11.0.15

- Fix startup script reload logic

## 11.0.14

- Minor changes

## 11.0.13

- Minor changes

## 11.0.12

- Minor changes

## 11.0.11

- Fix support for iOS < 17.2

## 11.0.10

- Minor changes

## 11.0.8

- Minor changes

## 11.0.7

- Minor changes

## 11.0.6

- Ensure all fs operation split query Alternative to #25

## 11.0.5

- Minor changes

## 11.0.4

- Minor changes

## 11.0.3

- Update libs Ensure CodeBlockMarkdownInformation is up to date

## 11.0.2

- Workaround [Clipper LF issue](https://github.com/obsidianmd/obsidian-clipper/issues/577)

## 11.0.1

- Minor changes

## 11.0.0

- insertSampleCodeButton
- Add removeAfterExecution
- Modify containing note functions
- Don't skip cache
- Handle empty frontmatter

## 10.1.0

- allowReturnOutsideFunction

## 10.0.0

- Rename _AnonymousPlugin
- Switch to new config format

## 9.3.4

- Minor changes

## 9.3.3

- Minor changes

## 9.3.2

- Minor changes

## 9.3.1

- Explicitly pass app to code blocks

## 9.3.0

- Add __filename/__dirname

## 9.2.0

- Make default property non-enumerable

## 9.1.0

- Partially implement dynamic `import()`
- Override console during script button call
- Duplicate default property
- Extract callstack from `Module.prototype.require`
- Prioritize available conditions

## 9.0.1

- Fix typo

## 9.0.0

- Add deprecated special modules, refactor

## 8.22.1

- Unify error messages
- Refactor special modules

## 8.22.0

- Pass parentPath to requireAsync (#22)

## 8.21.1

- Handle nested require calls (#22)
- Escape button captions into valid temp file names (#22)

## 8.21.0

- Allow invocable md scripts (#21)

## 8.20.1

- Fix incorrect detection `node:foo` as url module

## 8.20.0

- Fix wrong mobile support doc
- Add sourceFile (#20)

## 8.19.0

- Rename `Refresh Any View`
- Add raw mode (#19)

## 8.18.3

- Ensure different code buttons don't collide (Fixes #18)

## 8.18.2

- window.setTimeout

## 8.18.1

- Make markdown module support typescript syntax

## 8.18.0

- Add support for requireAsync optional deps
- Add support for markdown files
- Specify error message

## 8.17.4

- Minor changes

## 8.17.3

- Minor changes

## 8.17.2

- Minor changes

## 8.17.1

- Handle race condition

## 8.17.0

- Switch styles for dark/light theme
- Show validation messages

## 8.16.2

- Fixed `BRAT` and `Dataview` breakages introduced in [8.14.0](#8140)
- Avoid circular calls

## 8.16.1

- Attempted to fix the breakages introduced in [8.14.0](#8140)
- Restore patch of Module.prototype.require

## 8.16.0

- Disable protocol URLs by default

## 8.15.0

- Add URL protocol handler

## 8.14.2

- Minor changes

## 8.14.1

- Minor changes

## 8.14.0

- Support ASAR archives
- Support all Electron modules

### Introduced breakages

#### [`BRAT`](https://github.com/TfTHacker/obsidian42-brat)

It starts to show the following error when you check for updates.

```text
This does not seem to be an obsidian plugin with valid releases, as there are no releases available.
```

#### [Dataview](https://github.com/blacksmithgu/obsidian-dataview)

`dataviewjs` queries with `require` modules

````markdown
```dataviewjs
require('foo');
```
````

stops working with an error

```text
Evaluation Error: Error: Cannot find module 'foo'
Require stack:
- electron/js2c/renderer_init
    at Module._resolveFilename (node:internal/modules/cjs/loader:1232:15)
    at a._resolveFilename (node:electron/js2c/renderer_init:2:2643)
    at Module._load (node:internal/modules/cjs/loader:1058:27)
    at c._load (node:electron/js2c/node_init:2:16955)
    at s._load (node:electron/js2c/renderer_init:2:30981)
    at Module.require (node:internal/modules/cjs/loader:1318:19)
    at require (node:internal/modules/helpers:179:18)
    at hf (app://obsidian.md/app.js:1:653429)
    at s (app://obsidian.md/app.js:1:2271150)
    at eval (eval at <anonymous> (plugin:dataview), <anonymous>:1:56)
    at DataviewInlineApi.eval (plugin:dataview:19027:16)
    at evalInContext (plugin:dataview:19028:7)
    at asyncEvalInContext (plugin:dataview:19038:32)
    at DataviewJSRenderer.render (plugin:dataview:19064:19)
    at DataviewJSRenderer.onload (plugin:dataview:18606:14)
    at DataviewJSRenderer.load (app://obsidian.md/app.js:1:1214378)
    at DataviewApi.executeJs (plugin:dataview:19607:18)
    at DataviewPlugin.dataviewjs (plugin:dataview:20537:18)
    at eval (plugin:dataview:20415:124)
    at e.createCodeBlockPostProcessor (app://obsidian.md/app.js:1:1494428)
    at t.postProcess (app://obsidian.md/app.js:1:1511757)
    at t.postProcess (app://obsidian.md/app.js:1:1510723)
    at h (app://obsidian.md/app.js:1:1481846)
    at e.onRender (app://obsidian.md/app.js:1:1482106)
```

## 8.13.2

- Add missing super call

## 8.13.1

- New template
- Update template
- New template
- Update README

## 8.13.0

- Add support for ~ fenced block

## 8.12.0

- Allow to override module types

## 8.11.0

- Add support for .node/.wasm files
- Continue resolving on failed dependency
- Clear timestamps on fallback
- Add name of the failed dep

## 8.10.0

- Fix folder check on mobile
- Switch to optional options
- Add synchronous fallback
- `shouldUseSyncFallback` setting

## 8.9.6

- Minor changes

## 8.9.5

- Fix settings binding (thanks to @claremacrae)

## 8.9.4

- Update template

## 8.9.3

- Lint

## 8.9.2

- Refactor to SASS

## 8.9.1

- Add special module check in require()

## 8.9.0

- Add special case for crypto on mobile

## 8.8.4

- Format

## 8.8.3

- Minor changes

## 8.8.2

- Minor changes

## 8.8.1

- Minor changes

## 8.8.0

- Add `Reload Startup Script` command
- Blur after selection
- Skip validation messages
- Fix refresh timeout
- Add PathSuggest
- Validate paths
- Auto Save settings

## 8.7.2

- Fix wrong const

## 8.7.1

- Remove outdated `eslint`
- Add Debugging / Rebranding
- Fix relative wildcard resolution

## 8.7.0

- Switch to consoleDebugComponent.debug
- Add import.meta converters
- Check all export conditions
- Output error
- Update imports in README
- Better toJson
- Switch to ES2024

## 8.6.0

- Avoid confusing warnings

## 8.5.0

- Debug successful execution
- Allow disabling system messages
- Don't cache empty modules

## 8.4.0

- Fix multiple initialization
- Resolve entry point
- Support circular dependencies
- Support nested path without exports `node`
- Handle scoped modules
- Add suffixes for relative paths

## 8.3.0

- Add support for private modules
- Check suffixes for missing paths

## 8.2.0

- Add `autoOutput:false`

## 8.1.0

- Replace `window.builtInModuleNames` with `require('obsidian/builtInModuleNames')`

## 8.0.2

- Fix initial scripts initialization

## 8.0.1

- Expose window.builtInModuleNames
- Apply rebranding

## 8.0.0

- Add renderMarkdown
- Add console:false
- Pass container
- Add autorun
- Log last value
- Handle console
- Better stack traces
- Handle system root
- Add requireAsync
- Add support for nested console calls, eval, new Function()
- Fix caching
- Add validation
- Add mobile watcher

## 7.0.0

- Load/unload temp plugin
- Add mobile version

## 6.2.2

- Minor changes

## 6.2.1

- Minor changes

## 6.2.0

- Add support for '#privatePath' imports

## 6.1.0

- Add cleanup() support

## 6.0.0

- Force invoke name

## 5.2.3

- Minor changes

## 5.2.2

- Fix (no caption)

## 5.2.1

- Minor changes

## 5.2.0

- Add Clear Cache command

## 5.1.1

- Fix chmod

## 5.1.0

- Add Clear cache button
- Fix dependencies resolution

## 5.0.5

- Fix caching path

## 5.0.4

- Load plugin properly

## 5.0.3

- Fix `esbuild` first load

## 5.0.2

- Fix posix paths on Windows

## 5.0.1

- Fix build
- Lint

## 5.0.0

- Pass app to Invocables

## 4.9.1

- Fix `esbuild` resolution

## 4.9.0

- Handle folder imports
- Preserve __esModule flag
- Allow loading named modules from modulesRoot

## 4.8.0

- Switch to `obsidian-dev-utils`
- Add obsidian/app

## 4.7.0

- Use proper path for chmod

## 4.6.0

- Make binary runnable in Linux

## 4.5.0

- Fix absolute paths in Linux

## 4.4.0

- Fix installing from scratch

## 4.3.0

- Download `esbuild` binaries based on the platform
- Proper handle for circular dependencies in ESM

## 4.2.0

- Better fix for circular dependency

## 4.1.0

- Handle circular dependencies
- Fix relative path

## 4.0.0

- Add vault-root based require
- Add currentScriptPath to dynamicImport
- Support code blocks with more than 3 backticks
- Fix resolve for non-relative paths
- Register dynamicImport
- Use babel to support top level await
- Fix `esbuild` binary suffix

## 3.4.2

- Ensure settings are loaded before patching require

## 3.4.1

- Register code-button block earlier during load

## 3.4.0

- Fix require absolute paths

## 3.3.0

- Proper check for `require(".script.ts")`

## 3.2.1

- Show notice when settings saved

## 3.2.0

- Update README

## 3.1.0

- Download `esbuild` dependencies

## 3.0.0

- Watch script folder changes
- Enable code highlighting
- Check for script existence
- Process all scripts from the config folder
- Ensure stacktrace is accurate
- Reload config on every invoke to ensure latest dependency
- Fix timestamp check
- Fix circular dependencies
- Register code block
- Allow both CommonJS and ESM configs
- Add hotkeys button
- Add save button
- Fix immutability
- Fix performance for missing module
- Make dependency check reliable
- Add support for evaled dv.view()
- Invalidate cache if script changed
- Properly manage nested require
- Add support for local cjs

## 2.0.0

- Simplify to use Module.require, expose builtInModuleNames

## 1.0.1

- Initial version

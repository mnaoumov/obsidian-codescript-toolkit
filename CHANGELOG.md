# CHANGELOG

## 11.3.3

- chore: lint
- chore: update libs
- docs: update

## 11.3.2

- chore: update libs

## 11.3.1

- fix: intermittent watcher errors
  - re #42
- docs: add performance tip

## 11.3.0

- docs: fix links
- chore: lint
- feat: improve warning for whenPossible
- fix: misleading comment
- fix: proper support for CacheInvalidationMode.Always
- docs: warning
- docs: callouts for GitHub
- docs: better links

## 11.2.10

- docs: migrate to async

## 11.2.9

- fix: cache invalidation mode

## 11.2.8

- fix: cache invalidation mode

## 11.2.7

- fix: require ASAR

## 11.2.6

- fix: fix get-fonts require
- docs: add example
- docs: add missing bold
- docs: link to demo vault
- docs: add JS Engine
- docs: inline urls

## 11.2.5

- fix: make working in app.emulateMobile(true)

## 11.2.4

- fix: ensure sourcePath is correct after renames

## 11.2.3

- chore: force build

## 11.2.2

- fix: override incompatible settings to isRaw
  - fix #36

## 11.2.1

- fix: allow buttons that cannot be uniquely identified
  - fix: #35
- docs: split features in separate files
- chore: enable markdownlint
- refactor: move types to a separate file to use in README

## 11.2.0

- feat: add default code-button config
  - fix #34

## 11.1.7

- fix: build
- chore: update libs

## 11.1.6

- chore: enable conventional commits

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

- Rename Refresh Any View
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

- Remove outdated eslint
- Add Debugging / Rebranding
- Fix relative wildcard resolution

## 8.7.0

- Switch to plugin.consoleDebug
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
- Support nested path without exports node
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

- Fix esbuild first load

## 5.0.2

- Fix posix paths on Windows

## 5.0.1

- Fix build
- Lint

## 5.0.0

- Pass app to Invocables

## 4.9.1

- Fix esbuild resolution

## 4.9.0

- Handle folder imports
- Preserve __esModule flag
- Allow loading named modules from modulesRoot

## 4.8.0

- Switch to obsidian-dev-utils
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

- Download esbuild binaries based on the platform
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
- Fix esbuild binary suffix

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

- Download esbuild dependencies

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

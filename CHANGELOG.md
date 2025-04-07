# CHANGELOG

## 8.13.1

- Update libs
- New template
- Update template
- New template
- Update README

## 8.13.0

- Add support for ~ fenced block
- https://github.com/mnaoumov/obsidian-dev-utils/releases/tag/19.22.0

## 8.12.0

- Allow to override module types
- https://github.com/mnaoumov/obsidian-dev-utils/releases/tag/19.20.0

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
- https://github.com/mnaoumov/obsidian-dev-utils/releases/tag/19.19.1

## 8.9.6

- https://github.com/mnaoumov/obsidian-dev-utils/releases/tag/19.2.1

## 8.9.5

- Fix settings binding (thanks to @claremacrae)
- https://github.com/mnaoumov/obsidian-dev-utils/releases/tag/19.1.1

## 8.9.4

- Update template
- https://github.com/mnaoumov/obsidian-dev-utils/releases/tag/18.4.2

## 8.9.3

- Lint
- https://github.com/mnaoumov/obsidian-dev-utils/releases/tag/17.2.2

## 8.9.2

- Refactor to SASS

## 8.9.1

- Add special module check in require()

## 8.9.0

- Add special case for crypto on mobile

## 8.8.4

- Format

## 8.8.3

- https://github.com/mnaoumov/obsidian-dev-utils/releases/tag/16.1.0

## 8.8.2

- https://github.com/mnaoumov/obsidian-dev-utils/releases/tag/16.0.3

## 8.8.1

- https://github.com/mnaoumov/obsidian-dev-utils/releases/tag/15.0.0

## 8.8.0

- Add `Reload Startup Script` command
- Blur after selection
- Skip validation messages
- Fix refresh timeout
- Add PathSuggest
- Validate paths
- Auto Save settings
- https://github.com/mnaoumov/obsidian-dev-utils/releases/tag/14.3.0

## 8.7.2

- Fix wrong const

## 8.7.1

- Remove outdated eslint
- Add Debugging / Rebranding
- Fix relative wildcard resolution
- https://github.com/mnaoumov/obsidian-dev-utils/releases/tag/13.15.0

## 8.7.0

- Switch to plugin.consoleDebug
- Add import.meta converters
- Check all export conditions
- Output error
- Update imports in README
- Better toJson
- https://github.com/mnaoumov/obsidian-dev-utils/releases/tag/13.3.2
- Switch to ES2024

## 8.6.0

- Avoid confusing warnings

## 8.5.0

- Debug successful execution
- Allow disabling system messages
- Don't cache empty modules

## 8.4.0

- https://github.com/mnaoumov/obsidian-dev-utils/releases/tag/12.0.0
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
- https://github.com/mnaoumov/obsidian-dev-utils/releases/tag/11.2.0

## 6.2.2

- Update libs

## 6.2.1

- Update libs

## 6.2.0

- Add support for '#privatePath' imports

## 6.1.0

- Add cleanup() support

## 6.0.0

- Force invoke name

## 5.2.3

- Update libs

## 5.2.2

- Fix (no caption)

## 5.2.1

- Update libs

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

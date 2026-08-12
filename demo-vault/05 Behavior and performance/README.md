# Behavior and performance

Once your modules load, the questions change: when is a script re-read, what does `await` do at the top level, and where do breakpoints land. These notes cover how the plugin behaves around your code rather than what it can load.

| Note                                                    | What it covers                                                    |
| ------------------------------------------------------- | ----------------------------------------------------------------- |
| [30 Top-level await](<./30 Top-level await.md>)         | `await` at module level, without an `async main()` wrapper        |
| [31 Smart caching](<./31 Smart caching.md>)             | Edit a script and re-run it without restarting anything           |
| [32 Clear cache](<./32 Clear cache.md>)                 | Drop the cache when you deliberately told it not to invalidate    |
| [33 Skip transpilation](<./33 Skip transpilation.md>)   | Run large prebuilt bundles as-is instead of through Babel         |
| [34 Dynamic import](<./34 Dynamic import.md>)           | `import()` as an expression, wired to `requireAsync()`            |
| [35 requireAsyncWrapper](<./35 requireAsyncWrapper.md>) | Use async-only features from synchronous-looking code             |
| [36 Source maps](<./36 Source maps.md>)                 | Breakpoints land on the code you wrote, not the transpiled output |

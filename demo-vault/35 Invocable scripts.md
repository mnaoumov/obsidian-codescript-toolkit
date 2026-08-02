[Docs](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/invocable-scripts.md)

The invocable scripts folder is configured automatically by the Demo Vault Helper. [Invoke](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/invoke-scripts.md) any of these scripts from the `Command Palette`:

- Invoke command `CodeScript Toolkit: Invoke script: cjsSync.cjs`
- Invoke command `CodeScript Toolkit: Invoke script: cjsAsync.cjs`
- Invoke command `CodeScript Toolkit: Invoke script: mjsSync.mjs`
- Invoke command `CodeScript Toolkit: Invoke script: mjsAsync.mjs`
- Invoke command `CodeScript Toolkit: Invoke script: ctsSync.cts`
- Invoke command `CodeScript Toolkit: Invoke script: ctsAsync.cts`
- Invoke command `CodeScript Toolkit: Invoke script: mtsSync.mts`
- Invoke command `CodeScript Toolkit: Invoke script: mtsAsync.mts`
- Invoke command `CodeScript Toolkit: Invoke script: InvokeCommands/callback.ts`
- Invoke command `CodeScript Toolkit: Invoke script: InvokeCommands/checkCallback.ts`
- Invoke command `CodeScript Toolkit: Invoke script: InvokeCommands/editorCallback.ts`
- Invoke command `CodeScript Toolkit: Invoke script: InvokeCommands/editorCheckCallback.ts`
- Invoke command `CodeScript Toolkit: Custom name`
- Invoke command `CodeScript Toolkit: Async built command`
- Invoke command `CodeScript Toolkit: Invoke script: InvokeCommands/deprecatedInvokeCommand.ts`

`InvokeCommands/deprecatedInvokeCommand.ts` fails on purpose. It exports the removed `invokeCommand` object instead of a `buildInvokeCommand()` function, so a notice about it appears when this vault is loaded, and invoking its command only repeats that notice instead of running the script.

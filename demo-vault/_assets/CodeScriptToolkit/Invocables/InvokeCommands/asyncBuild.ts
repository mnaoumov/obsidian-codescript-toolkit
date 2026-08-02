import {
  App,
  Command,
  Notice
} from 'obsidian';

// `buildInvokeCommand()` may be `async`, so the command can be built from data loaded first.
export async function buildInvokeCommand(app: App): Promise<Partial<Command>> {
  const listedFiles = await app.vault.adapter.list('/');
  const rootItemCount = listedFiles.files.length + listedFiles.folders.length;

  return {
    callback: (): void => {
      const message = `Command built asynchronously. Vault root has ${rootItemCount.toString()} items`;
      new Notice(message);
      console.log(message);
    },
    name: 'Async built command'
  };
}

import {
  App,
  Command,
  Notice
} from 'obsidian';

export function buildInvokeCommand(app: App): Partial<Command> {
  return {
    callback: (): void => {
      const message = `Command with callback. Vault: ${app.vault.getName()}`;
      new Notice(message);
      console.log(message);
    }
  };
}

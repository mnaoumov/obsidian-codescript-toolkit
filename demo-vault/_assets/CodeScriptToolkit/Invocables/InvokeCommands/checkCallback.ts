import {
  App,
  Command,
  Notice
} from 'obsidian';

export function buildInvokeCommand(app: App): Partial<Command> {
  return {
    checkCallback: (checking: boolean): boolean => {
      const file = app.workspace.getActiveFile();
      if (!file) {
        return false;
      }
      if (file.basename !== '36 Invocable scripts') {
        return false;
      }

      if (!checking) {
        const message = 'Command with checkCallback';
        new Notice(message);
        console.log(message);
      }

      return true;
    }
  };
}

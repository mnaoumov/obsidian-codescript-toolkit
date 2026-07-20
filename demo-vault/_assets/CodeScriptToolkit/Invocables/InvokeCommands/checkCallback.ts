import {
  Command,
  Notice
} from 'obsidian';

export const invokeCommand: Partial<Command> = {
  checkCallback(checking: boolean): boolean {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      return false;
    }
    if (file.basename !== '35 Invocable scripts') {
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

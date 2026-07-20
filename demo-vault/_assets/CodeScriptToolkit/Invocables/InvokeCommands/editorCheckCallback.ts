import {
  Command,
  Editor,
  MarkdownFileInfo,
  MarkdownView,
  Notice
} from 'obsidian';

export const invokeCommand: Partial<Command> = {
  editorCheckCallback(checking: boolean, editor: Editor, ctx: MarkdownView | MarkdownFileInfo): boolean {
    if (ctx.file?.basename !== '35 Invocable scripts') {
      return false;
    }

    if (!checking) {
      const message = 'Command with editorCheckCallback';
      new Notice(message);
      console.log(message);
    }

    return true;
  }
};

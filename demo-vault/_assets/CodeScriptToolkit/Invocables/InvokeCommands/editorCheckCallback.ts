import {
  Command,
  Editor,
  MarkdownFileInfo,
  MarkdownView,
  Notice
} from 'obsidian';

export function buildInvokeCommand(): Partial<Command> {
  return {
    editorCheckCallback: (checking: boolean, editor: Editor, ctx: MarkdownView | MarkdownFileInfo): boolean => {
      if (ctx.file?.basename !== '36 Invocable scripts') {
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
}

import {
  Command,
  Editor,
  MarkdownFileInfo,
  MarkdownView,
  Notice
} from 'obsidian';

export function buildInvokeCommand(): Partial<Command> {
  return {
    editorCallback: (editor: Editor, ctx: MarkdownView | MarkdownFileInfo): void => {
      const message = 'Command with editorCallback';
      new Notice(message);
      console.log(message);
    }
  };
}

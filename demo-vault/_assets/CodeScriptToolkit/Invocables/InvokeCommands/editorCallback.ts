import {
  Command,
  Editor,
  MarkdownFileInfo,
  MarkdownView,
  Notice
} from 'obsidian';

export const invokeCommand: Partial<Command> = {
  editorCallback(editor: Editor, ctx: MarkdownView | MarkdownFileInfo): void {
    const message = 'Command with editorCallback';
    new Notice(message);
    console.log(message);
  }
};

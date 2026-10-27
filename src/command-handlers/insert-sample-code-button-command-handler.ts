import type { Editor } from 'obsidian';

import { EditorCommandHandler } from '@mnaoumov/obsidian-lib/command-handlers/editor-command-handler';

import { insertSampleCodeButton } from '../code-buttons/code-button-block.ts';

export class InsertSampleCodeButtonCommandHandler extends EditorCommandHandler {
  public constructor() {
    super({
      icon: 'code',
      id: 'insert-sample-code-button',
      name: 'Insert sample code button'
    });
  }

  protected override executeEditor(editor: Editor): void {
    insertSampleCodeButton(editor);
  }
}

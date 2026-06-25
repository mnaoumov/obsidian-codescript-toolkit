import type { Editor } from 'obsidian';

import { castTo } from 'obsidian-dev-utils/object-utils';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { insertSampleCodeButton } from '../code-button-block.ts';
import { InsertSampleCodeButtonCommandHandler } from './insert-sample-code-button-command-handler.ts';

vi.mock('../code-button-block.ts', () => ({
  insertSampleCodeButton: vi.fn()
}));

interface InsertSampleCodeButtonCommandHandlerPrivateApi {
  executeEditor(editor: Editor): void;
}

describe('InsertSampleCodeButtonCommandHandler', () => {
  it('should delegate to insertSampleCodeButton with the editor when executed', () => {
    const handler = new InsertSampleCodeButtonCommandHandler();
    const editor = castTo<Editor>({});

    castTo<InsertSampleCodeButtonCommandHandlerPrivateApi>(handler).executeEditor(editor);

    expect(insertSampleCodeButton).toHaveBeenCalledWith(editor);
  });
});

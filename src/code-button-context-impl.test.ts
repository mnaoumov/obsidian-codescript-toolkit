import type {
  App,
  MarkdownPostProcessorContext
} from 'obsidian';
import type { CodeBlockMarkdownInformation } from 'obsidian-dev-utils/obsidian/code-block-markdown-information';

import { strictProxy } from 'obsidian-dev-utils/strict-proxy';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { CodeButtonBlockConfig } from './code-button-block-config.ts';
import type { RegisterTempPluginParams } from './code-button-context.ts';
import type { TempPluginRegistry } from './temp-plugin-registry.ts';

import { CodeButtonContextImpl } from './code-button-context-impl.ts';

const mockGetFile = vi.fn();
const mockInsertAfterCodeBlock = vi.fn();
const mockInsertBeforeCodeBlock = vi.fn();
const mockRemoveCodeBlock = vi.fn();
const mockReplaceCodeBlock = vi.fn();
const mockGetConsoleInstance = vi.fn();
const mockRegisterTempPlugin = vi.fn();
const mockMarkdownRendererRender = vi.fn();

vi.mock('obsidian', async (importOriginal) => ({
  ...await importOriginal<typeof import('obsidian')>(),
  Component: vi.fn(),
  MarkdownRenderer: {
    render: (...args: unknown[]): unknown => mockMarkdownRendererRender(...args)
  }
}));

vi.mock('obsidian-dev-utils/obsidian/file-system', () => ({
  getFile: (...args: unknown[]): unknown => mockGetFile(...args)
}));

vi.mock('obsidian-dev-utils/obsidian/markdown-code-block-processor', () => ({
  insertAfterCodeBlock: (...args: unknown[]): unknown => mockInsertAfterCodeBlock(...args),
  insertBeforeCodeBlock: (...args: unknown[]): unknown => mockInsertBeforeCodeBlock(...args),
  removeCodeBlock: (...args: unknown[]): unknown => mockRemoveCodeBlock(...args),
  replaceCodeBlock: (...args: unknown[]): unknown => mockReplaceCodeBlock(...args)
}));

vi.mock('./console-wrapper.ts', () => ({
  ConsoleWrapper: class MockConsoleWrapper {
    public getConsoleInstance(...args: unknown[]): unknown {
      return mockGetConsoleInstance(...args);
    }
  }
}));

vi.mock('./temp-plugin-registry.ts', () => ({
  TempPluginRegistry: class MockTempPluginRegistry {
    public registerTempPlugin(...args: unknown[]): void {
      mockRegisterTempPlugin(...args);
    }
  }
}));

interface CreateContextParams {
  config?: Partial<CodeButtonBlockConfig>;
  markdownInfo?: CodeBlockMarkdownInformation | null;
  source?: string;
  sourcePath?: string;
}

function createContext(params: CreateContextParams = {}): CodeButtonContextImpl {
  const partialApp: Partial<App> = { vault: {} as App['vault'] };
  const mockApp = partialApp as App;
  const mockSourceFile = { path: 'notes/test.md' };
  mockGetFile.mockReturnValue(mockSourceFile);

  const mockWrappedConsole: Partial<Console> = { log: vi.fn() };
  mockGetConsoleInstance.mockReturnValue(mockWrappedConsole);

  const config = createMockConfig(params.config);
  const parentEl = createDiv();
  const resultEl = createDiv();

  const partialCtx: Partial<MarkdownPostProcessorContext> = {
    addChild: vi.fn(),
    docId: 'doc-1',
    frontmatter: undefined,
    getSectionInfo: vi.fn().mockReturnValue(null),
    sourcePath: params.sourcePath ?? 'notes/test.md'
  };
  const ctx = partialCtx as MarkdownPostProcessorContext;

  const mockTempPluginRegistry: Partial<TempPluginRegistry> = {
    registerTempPlugin: mockRegisterTempPlugin
  };

  return new CodeButtonContextImpl({
    app: mockApp,
    config,
    markdownInfo: params.markdownInfo ?? null,
    markdownPostProcessorContext: ctx,
    parentEl,
    resultEl,
    source: params.source ?? 'console.log("hello")',
    tempPluginRegistry: mockTempPluginRegistry as TempPluginRegistry
  });
}

function createMockConfig(overrides: Partial<CodeButtonBlockConfig> = {}): CodeButtonBlockConfig {
  return {
    caption: 'Run',
    isRaw: false,
    removeAfterExecution: { shouldKeepGap: false, when: 'never' },
    shouldAutoOutput: true,
    shouldAutoRun: false,
    shouldShowSystemMessages: true,
    shouldWrapConsole: true,
    ...overrides
  };
}

describe('CodeButtonContextImpl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should set container to parentEl when isRaw is true', () => {
      const context = createContext({ config: { isRaw: true } });
      expect(context.container).toBe(context.parentEl);
    });

    it('should set container to resultEl when isRaw is false', () => {
      const context = createContext({ config: { isRaw: false } });
      expect(context.container).not.toBe(context.parentEl);
    });

    it('should call getConsoleInstance with shouldWrapConsole true', () => {
      createContext({ config: { shouldWrapConsole: true } });
      expect(mockGetConsoleInstance).toHaveBeenCalledWith(true);
    });

    it('should call getConsoleInstance with shouldWrapConsole false', () => {
      createContext({ config: { shouldWrapConsole: false } });
      expect(mockGetConsoleInstance).toHaveBeenCalledWith(false);
    });

    it('should call getFile with the app and sourcePath', () => {
      createContext({ sourcePath: 'my/note.md' });
      expect(mockGetFile).toHaveBeenCalledWith(
        expect.anything(),
        'my/note.md'
      );
    });

    it('should assign sourceFile from getFile result', () => {
      const context = createContext();
      expect(context.sourceFile).toEqual({ path: 'notes/test.md' });
    });

    it('should assign source from params', () => {
      const context = createContext({ source: 'my source code' });
      expect(context.source).toBe('my source code');
    });

    it('should assign markdownInfo from params', () => {
      const info = strictProxy<CodeBlockMarkdownInformation>({ args: [] });
      const context = createContext({ markdownInfo: info });
      expect(context.markdownInfo).toBe(info);
    });
  });

  describe('insertAfterCodeButtonBlock', () => {
    it('should call insertAfterCodeBlock with default lineOffset and shouldPreserveLinePrefix', async () => {
      const context = createContext();
      await context.insertAfterCodeButtonBlock('# Hello');

      expect(mockInsertAfterCodeBlock).toHaveBeenCalledWith(
        expect.objectContaining({
          lineOffset: 0,
          shouldPreserveLinePrefix: true,
          text: '# Hello'
        })
      );
    });

    it('should call insertAfterCodeBlock with custom lineOffset', async () => {
      const CUSTOM_LINE_OFFSET = 5;
      const context = createContext();
      await context.insertAfterCodeButtonBlock('text', CUSTOM_LINE_OFFSET);

      expect(mockInsertAfterCodeBlock).toHaveBeenCalledWith(
        expect.objectContaining({
          lineOffset: CUSTOM_LINE_OFFSET
        })
      );
    });

    it('should call insertAfterCodeBlock with shouldPreserveLinePrefix false', async () => {
      const context = createContext();
      await context.insertAfterCodeButtonBlock('text', 0, false);

      expect(mockInsertAfterCodeBlock).toHaveBeenCalledWith(
        expect.objectContaining({
          shouldPreserveLinePrefix: false
        })
      );
    });

    it('should pass app, ctx, el, and source to insertAfterCodeBlock', async () => {
      const context = createContext();
      await context.insertAfterCodeButtonBlock('md');

      expect(mockInsertAfterCodeBlock).toHaveBeenCalledWith(
        expect.objectContaining({
          app: context.app,
          ctx: context.markdownPostProcessorContext,
          el: context.parentEl,
          source: context.source
        })
      );
    });
  });

  describe('insertBeforeCodeButtonBlock', () => {
    it('should call insertBeforeCodeBlock with default parameters', async () => {
      const context = createContext();
      await context.insertBeforeCodeButtonBlock('before text');

      expect(mockInsertBeforeCodeBlock).toHaveBeenCalledWith(
        expect.objectContaining({
          lineOffset: 0,
          shouldPreserveLinePrefix: true,
          text: 'before text'
        })
      );
    });

    it('should call insertBeforeCodeBlock with custom lineOffset and shouldPreserveLinePrefix', async () => {
      const CUSTOM_LINE_OFFSET = 3;
      const context = createContext();
      await context.insertBeforeCodeButtonBlock('text', CUSTOM_LINE_OFFSET, false);

      expect(mockInsertBeforeCodeBlock).toHaveBeenCalledWith(
        expect.objectContaining({
          lineOffset: CUSTOM_LINE_OFFSET,
          shouldPreserveLinePrefix: false
        })
      );
    });
  });

  describe('removeCodeButtonBlock', () => {
    it('should call removeCodeBlock with default shouldKeepGap false', async () => {
      const context = createContext();
      await context.removeCodeButtonBlock();

      expect(mockRemoveCodeBlock).toHaveBeenCalledWith(
        expect.objectContaining({
          shouldKeepGap: false
        })
      );
    });

    it('should call removeCodeBlock with shouldKeepGap true', async () => {
      const context = createContext();
      await context.removeCodeButtonBlock(true);

      expect(mockRemoveCodeBlock).toHaveBeenCalledWith(
        expect.objectContaining({
          shouldKeepGap: true
        })
      );
    });

    it('should pass app, ctx, el, and source to removeCodeBlock', async () => {
      const context = createContext();
      await context.removeCodeButtonBlock();

      expect(mockRemoveCodeBlock).toHaveBeenCalledWith(
        expect.objectContaining({
          app: context.app,
          ctx: context.markdownPostProcessorContext,
          el: context.parentEl,
          source: context.source
        })
      );
    });
  });

  describe('replaceCodeButtonBlock', () => {
    it('should call replaceCodeBlock with default parameters', async () => {
      const context = createContext();
      await context.replaceCodeButtonBlock('new content');

      expect(mockReplaceCodeBlock).toHaveBeenCalledWith(
        expect.objectContaining({
          codeBlockProvider: 'new content',
          shouldKeepGapWhenEmpty: false,
          shouldPreserveLinePrefix: true
        })
      );
    });

    it('should call replaceCodeBlock with custom shouldPreserveLinePrefix and shouldKeepGapWhenEmpty', async () => {
      const context = createContext();
      await context.replaceCodeButtonBlock('content', false, true);

      expect(mockReplaceCodeBlock).toHaveBeenCalledWith(
        expect.objectContaining({
          shouldKeepGapWhenEmpty: true,
          shouldPreserveLinePrefix: false
        })
      );
    });
  });

  describe('renderMarkdown', () => {
    it('should call MarkdownRenderer.render with correct arguments', async () => {
      const context = createContext();
      await context.renderMarkdown('# Title');

      expect(mockMarkdownRendererRender).toHaveBeenCalledWith(
        context.app,
        '# Title',
        context.container,
        context.sourceFile.path,
        context
      );
    });
  });

  describe('registerTempPlugin', () => {
    it('should delegate to tempPluginRegistry.registerTempPlugin', async () => {
      const context = createContext();
      const params: RegisterTempPluginParams = {
        tempPluginClass: vi.fn() as never
      };
      await context.registerTempPlugin(params);

      expect(mockRegisterTempPlugin).toHaveBeenCalledWith(params);
    });
  });
});

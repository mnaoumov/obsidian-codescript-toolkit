import type {
  App,
  MarkdownPostProcessorContext
} from 'obsidian';
import type { CodeBlockMarkdownInformation } from 'obsidian-dev-utils/obsidian/code-block-markdown-information';
import type { ResourceLockComponent } from 'obsidian-dev-utils/obsidian/resource-lock';

import { castTo } from 'obsidian-dev-utils/object-utils';
import { strictProxy } from 'obsidian-dev-utils/strict-proxy';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { CodeButtonBlockConfig } from './code-button-block-config.ts';
import type { RegisterTempPluginParams as RegisterTemporaryPluginParams } from './code-button-context.ts';
// eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (docs/code-button-context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
import type { TempPluginRegistryComponent } from './temp-plugin-registry.ts';

import { SourceVisibility } from './code-button-block-config.ts';
import { CodeButtonContextImplComponent } from './code-button-context-impl.ts';

const mockGetFile = vi.fn();
const mockInsertAfterCodeBlock = vi.fn();
const mockInsertBeforeCodeBlock = vi.fn();
const mockRemoveCodeBlock = vi.fn();
const mockReplaceCodeBlock = vi.fn();
const mockGetConsoleInstance = vi.fn();
const mockGetTemporaryPlugin = vi.fn();
const mockRegisterTemporaryPlugin = vi.fn();
const mockMarkdownRendererRender = vi.fn();
const mockResourceLockComponent = castTo<ResourceLockComponent>({});

vi.mock('obsidian', async (importOriginal) => ({
  ...await importOriginal<typeof import('obsidian')>(),
  Component: vi.fn(),
  MarkdownRenderer: {
    render: (...$arguments: unknown[]): unknown => mockMarkdownRendererRender(...$arguments)
  }
}));

vi.mock('obsidian-dev-utils/obsidian/file-system', () => ({
  getFile: (...$arguments: unknown[]): unknown => mockGetFile(...$arguments)
}));

vi.mock('obsidian-dev-utils/obsidian/markdown-code-block-processor', () => ({
  insertAfterCodeBlock: (...$arguments: unknown[]): unknown => mockInsertAfterCodeBlock(...$arguments),
  insertBeforeCodeBlock: (...$arguments: unknown[]): unknown => mockInsertBeforeCodeBlock(...$arguments),
  removeCodeBlock: (...$arguments: unknown[]): unknown => mockRemoveCodeBlock(...$arguments),
  replaceCodeBlock: (...$arguments: unknown[]): unknown => mockReplaceCodeBlock(...$arguments)
}));

vi.mock('./console-wrapper.ts', () => ({
  ConsoleWrapper: class MockConsoleWrapper {
    public getConsoleInstance(...$arguments: unknown[]): unknown {
      return mockGetConsoleInstance(...$arguments);
    }
  }
}));

vi.mock('./temp-plugin-registry.ts', () => ({
  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (docs/code-button-context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  TempPluginRegistry: class MockTemporaryPluginRegistry {
    // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (docs/code-button-context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
    public getTempPlugin(...$arguments: unknown[]): unknown {
      return mockGetTemporaryPlugin(...$arguments);
    }

    // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (docs/code-button-context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
    public registerTempPlugin(...$arguments: unknown[]): void {
      mockRegisterTemporaryPlugin(...$arguments);
    }
  }
}));

interface CreateContextParams {
  readonly config?: Partial<CodeButtonBlockConfig>;
  readonly markdownInfo?: CodeBlockMarkdownInformation | null;
  readonly source?: string;
  readonly sourcePath?: string;
}

function createContext(params: CreateContextParams = {}): CodeButtonContextImplComponent {
  const partialApp: Partial<App> = { vault: {} as App['vault'] };
  const mockApp = partialApp as App;
  const mockSourceFile = { path: 'notes/test.md' };
  mockGetFile.mockReturnValue(mockSourceFile);

  const mockWrappedConsole: Partial<Console> = { log: vi.fn() };
  mockGetConsoleInstance.mockReturnValue(mockWrappedConsole);

  const config = createMockConfig(params.config);
  const parentEl = createDiv();
  const resultEl = createDiv();

  const partialContext: Partial<MarkdownPostProcessorContext> = {
    addChild: vi.fn(),
    docId: 'doc-1',
    frontmatter: undefined,
    getSectionInfo: vi.fn().mockReturnValue(null),
    sourcePath: params.sourcePath ?? 'notes/test.md'
  };
  const context = partialContext as MarkdownPostProcessorContext;

  const mockTemporaryPluginRegistry: Partial<TempPluginRegistryComponent> = {
    // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (docs/code-button-context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
    getTempPlugin: mockGetTemporaryPlugin,
    // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (docs/code-button-context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
    registerTempPlugin: mockRegisterTemporaryPlugin
  };

  return new CodeButtonContextImplComponent({
    app: mockApp,
    config,
    markdownInfo: params.markdownInfo ?? null,
    markdownPostProcessorContext: context,
    parentEl,
    resourceLockComponent: mockResourceLockComponent,
    resultEl,
    source: params.source ?? 'console.log("hello")',
    // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (docs/code-button-context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
    tempPluginRegistry: mockTemporaryPluginRegistry as TempPluginRegistryComponent
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
    sourceVisibility: SourceVisibility.Hidden,
    ...overrides
  };
}

describe('CodeButtonContextImplComponent', () => {
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
      const context = createContext({ sourcePath: 'my/note.md' });
      expect(mockGetFile).toHaveBeenCalledWith({
        app: context.app,
        pathOrFile: 'my/note.md'
      });
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
      const info = strictProxy<CodeBlockMarkdownInformation>({ $arguments: [] });
      const context = createContext({ markdownInfo: info });
      expect(context.markdownInfo).toBe(info);
    });
  });

  describe('insertAfterCodeButtonBlock', () => {
    it('should call insertAfterCodeBlock with default lineOffset and shouldPreserveLinePrefix', async () => {
      const context = createContext();
      await context.insertAfterCodeButtonBlock({ markdown: '# Hello' });

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
      await context.insertAfterCodeButtonBlock({ lineOffset: CUSTOM_LINE_OFFSET, markdown: 'text' });

      expect(mockInsertAfterCodeBlock).toHaveBeenCalledWith(
        expect.objectContaining({
          lineOffset: CUSTOM_LINE_OFFSET
        })
      );
    });

    it('should call insertAfterCodeBlock with shouldPreserveLinePrefix false', async () => {
      const context = createContext();
      await context.insertAfterCodeButtonBlock({ lineOffset: 0, markdown: 'text', shouldPreserveLinePrefix: false });

      expect(mockInsertAfterCodeBlock).toHaveBeenCalledWith(
        expect.objectContaining({
          shouldPreserveLinePrefix: false
        })
      );
    });

    it('should pass app, context, el, and source to insertAfterCodeBlock', async () => {
      const context = createContext();
      await context.insertAfterCodeButtonBlock({ markdown: 'md' });

      expect(mockInsertAfterCodeBlock).toHaveBeenCalledWith(
        expect.objectContaining({
          app: context.app,
          context: context.markdownPostProcessorContext,
          el: context.parentEl,
          resourceLockComponent: mockResourceLockComponent,
          source: context.source
        })
      );
    });
  });

  describe('insertBeforeCodeButtonBlock', () => {
    it('should call insertBeforeCodeBlock with default parameters', async () => {
      const context = createContext();
      await context.insertBeforeCodeButtonBlock({ markdown: 'before text' });

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
      await context.insertBeforeCodeButtonBlock({ lineOffset: CUSTOM_LINE_OFFSET, markdown: 'text', shouldPreserveLinePrefix: false });

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

    it('should pass app, context, el, and source to removeCodeBlock', async () => {
      const context = createContext();
      await context.removeCodeButtonBlock();

      expect(mockRemoveCodeBlock).toHaveBeenCalledWith(
        expect.objectContaining({
          app: context.app,
          context: context.markdownPostProcessorContext,
          el: context.parentEl,
          resourceLockComponent: mockResourceLockComponent,
          source: context.source
        })
      );
    });
  });

  describe('replaceCodeButtonBlock', () => {
    it('should call replaceCodeBlock with default parameters', async () => {
      const context = createContext();
      await context.replaceCodeButtonBlock({ markdown: 'new content' });

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
      await context.replaceCodeButtonBlock({ markdown: 'content', shouldKeepGapWhenEmpty: true, shouldPreserveLinePrefix: false });

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

  describe('getTempPlugin', () => {
    it('should delegate to tempPluginRegistry.getTempPlugin', () => {
      const context = createContext();
      const mockPlugin = { id: 'test' };
      mockGetTemporaryPlugin.mockReturnValue(mockPlugin);

      const result = context.getTempPlugin('TestPlugin');

      expect(mockGetTemporaryPlugin).toHaveBeenCalledWith('TestPlugin');
      expect(result).toBe(mockPlugin);
    });
  });

  describe('registerTempPlugin', () => {
    it('should delegate to tempPluginRegistry.registerTempPlugin', async () => {
      const context = createContext();
      const params: RegisterTemporaryPluginParams = {
        // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (docs/code-button-context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
        tempPluginClass: vi.fn()
      };
      await context.registerTempPlugin(params);

      expect(mockRegisterTemporaryPlugin).toHaveBeenCalledWith(params);
    });
  });
});

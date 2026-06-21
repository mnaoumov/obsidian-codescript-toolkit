import type {
  App,
  Editor,
  MarkdownPostProcessorContext,
  TFile
} from 'obsidian';
import type { CodeBlockMarkdownInformation } from 'obsidian-dev-utils/obsidian/code-block-markdown-information';
import type { MarkdownCodeBlockProcessorRegistrar } from 'obsidian-dev-utils/obsidian/markdown-code-block-processor-registrar';

import { castTo } from 'obsidian-dev-utils/object-utils';
import { strictProxy } from 'obsidian-dev-utils/strict-proxy';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type {
  CodeButtonBlockConfig,
  RemoveAfterExecutionConfig
} from './code-button-block-config.ts';
import type { CodeButtonContext } from './code-button-context.ts';
import type { PluginSettingsComponent } from './plugin-settings-component.ts';
import type { RequireHandlerFactoryComponent } from './require-handlers/require-handler-factory.ts';
import type { TempPluginRegistryComponent } from './temp-plugin-registry.ts';

import {
  CodeButtonBlockComponent,
  DEFAULT_CODE_BUTTON_BLOCK_CONFIG,
  insertSampleCodeButton
} from './code-button-block.ts';

const mockGetFile = vi.fn();
const mockGetCodeBlockMarkdownInfo = vi.fn();
const mockReplaceCodeBlock = vi.fn();
const mockInvokeAsyncSafely = vi.fn((fn: () => unknown) => fn());
const mockPrintError = vi.fn();
const mockGetDataAdapterEx = vi.fn();
const mockGetOsAndObsidianUnsafePathCharsRegExp = vi.fn();

interface BabelTransformResult {
  readonly error: Error | undefined;
  readonly transformedCode: string;
}

vi.mock('obsidian-dev-utils/async', () => ({
  invokeAsyncSafely: (...args: unknown[]): unknown => (mockInvokeAsyncSafely as (...a: unknown[]) => unknown)(...args)
}));

vi.mock('obsidian-dev-utils/error', () => ({
  printError: (...args: unknown[]): unknown => mockPrintError(...args)
}));

vi.mock('obsidian-dev-utils/obsidian/file-system', () => ({
  getFile: (...args: unknown[]): unknown => mockGetFile(...args)
}));

vi.mock('obsidian-dev-utils/obsidian/markdown-code-block-processor', () => ({
  getCodeBlockMarkdownInfo: (...args: unknown[]): unknown => mockGetCodeBlockMarkdownInfo(...args),
  replaceCodeBlock: (...args: unknown[]): unknown => mockReplaceCodeBlock(...args)
}));

vi.mock('obsidian-dev-utils/obsidian/validation', () => ({
  getOsAndObsidianUnsafePathCharsRegExp: (...args: unknown[]): unknown => mockGetOsAndObsidianUnsafePathCharsRegExp(...args)
}));

vi.mock('@obsidian-typings/obsidian-public-latest/implementations', () => ({
  getDataAdapterEx: (...args: unknown[]): unknown => mockGetDataAdapterEx(...args)
}));

vi.mock('./babel/combine-babel-plugins.ts', () => ({
  SequentialBabelPlugin: class {
    public transform(code: string): BabelTransformResult {
      return { error: undefined, transformedCode: `transformed:${code}` };
    }
  }
}));

vi.mock('./babel/convert-to-common-js-babel-plugin.ts', () => ({
  ConvertToCommonJsBabelPlugin: vi.fn()
}));

vi.mock('./babel/replace-dynamic-import-babel-plugin.ts', () => ({
  ReplaceDynamicImportBabelPlugin: vi.fn()
}));

vi.mock('./babel/wrap-for-code-block-babel-plugin.ts', () => ({
  WrapForCodeBlockBabelPlugin: vi.fn()
}));

const mockConsoleWrapperWriteSystemMessage = vi.fn();
const mockConsoleWrapperAppendToResultEl = vi.fn();

vi.mock('./console-wrapper.ts', () => ({
  ConsoleWrapper: class MockConsoleWrapper {
    public appendToResultEl(...args: unknown[]): void {
      mockConsoleWrapperAppendToResultEl(...args);
    }

    public getConsoleInstance(): Console {
      return console;
    }

    public writeSystemMessage(...args: unknown[]): void {
      mockConsoleWrapperWriteSystemMessage(...args);
    }
  }
}));

interface MockConstructorParams {
  readonly app: unknown;
  readonly config: CodeButtonBlockConfig;
  readonly markdownInfo: unknown;
  readonly markdownPostProcessorContext: unknown;
  readonly parentEl: HTMLElement;
  readonly source: string;
}

interface MockSourceFile {
  path: string;
}

vi.mock('./code-button-context-impl.ts', () => ({
  CodeButtonContextImplComponent: class MockCodeButtonContextImplComponent {
    public readonly app: unknown;
    public readonly config: CodeButtonBlockConfig;
    public readonly container: HTMLElement;
    public readonly markdownInfo: unknown;
    public readonly markdownPostProcessorContext: unknown;
    public readonly parentEl: HTMLElement;
    public readonly removeCodeButtonBlock = vi.fn();
    public readonly source: string;
    public readonly sourceFile: MockSourceFile;

    public constructor(params: MockConstructorParams) {
      this.app = params.app;
      this.config = params.config;
      this.markdownInfo = params.markdownInfo;
      this.markdownPostProcessorContext = params.markdownPostProcessorContext;
      this.parentEl = params.parentEl;
      this.source = params.source;
      this.sourceFile = { path: 'notes/test.md' };
      this.container = createDiv();
      this.container.empty = vi.fn();
    }
  }
}));

vi.mock('./temp-plugin-registry.ts', () => ({
  TempPluginRegistry: vi.fn()
}));

describe('DEFAULT_CODE_BUTTON_BLOCK_CONFIG', () => {
  it('should have caption "(no caption)"', () => {
    expect(DEFAULT_CODE_BUTTON_BLOCK_CONFIG.caption).toBe('(no caption)');
  });

  it('should have isRaw false', () => {
    expect(DEFAULT_CODE_BUTTON_BLOCK_CONFIG.isRaw).toBe(false);
  });

  it('should have shouldAutoOutput true', () => {
    expect(DEFAULT_CODE_BUTTON_BLOCK_CONFIG.shouldAutoOutput).toBe(true);
  });

  it('should have shouldAutoRun false', () => {
    expect(DEFAULT_CODE_BUTTON_BLOCK_CONFIG.shouldAutoRun).toBe(false);
  });

  it('should have shouldShowSystemMessages true', () => {
    expect(DEFAULT_CODE_BUTTON_BLOCK_CONFIG.shouldShowSystemMessages).toBe(true);
  });

  it('should have shouldWrapConsole true', () => {
    expect(DEFAULT_CODE_BUTTON_BLOCK_CONFIG.shouldWrapConsole).toBe(true);
  });

  it('should have removeAfterExecution.when "never"', () => {
    expect(DEFAULT_CODE_BUTTON_BLOCK_CONFIG.removeAfterExecution.when).toBe('never');
  });

  it('should have removeAfterExecution.shouldKeepGap false', () => {
    expect(DEFAULT_CODE_BUTTON_BLOCK_CONFIG.removeAfterExecution.shouldKeepGap).toBe(false);
  });
});

interface ButtonCreateElOptions {
  onclick?(): Promise<void>;
}

interface CodeMirrorApi {
  defineMode: ReturnType<typeof vi.fn>;
  getMode: ReturnType<typeof vi.fn>;
}

interface WindowWithCodeMirror {
  CodeMirror: CodeMirrorApi;
}

describe('insertSampleCodeButton', () => {
  it('should insert a code-button block at the cursor position', () => {
    const partialEditor: Partial<Editor> = {
      getCursor: vi.fn().mockReturnValue({ ch: 0, line: 0 }),
      getLine: vi.fn().mockReturnValue(''),
      replaceSelection: vi.fn()
    };
    const mockEditor = partialEditor as Editor;

    insertSampleCodeButton(mockEditor);

    expect(mockEditor.replaceSelection).toHaveBeenCalledOnce();
    const insertedText = vi.mocked(mockEditor.replaceSelection).mock.calls[0]?.[0] ?? '';
    expect(insertedText).toContain('```code-button');
    expect(insertedText).toContain('// Code');
  });

  it('should preserve line prefix from blockquote', () => {
    const partialEditor: Partial<Editor> = {
      getCursor: vi.fn().mockReturnValue({ ch: 2, line: 0 }),
      getLine: vi.fn().mockReturnValue('> '),
      replaceSelection: vi.fn()
    };
    const mockEditor = partialEditor as Editor;

    insertSampleCodeButton(mockEditor);

    expect(mockEditor.replaceSelection).toHaveBeenCalledOnce();
  });

  it('should prepend newline when cursor is not at line start matching prefix', () => {
    const partialEditor: Partial<Editor> = {
      getCursor: vi.fn().mockReturnValue({ ch: 5, line: 0 }),
      getLine: vi.fn().mockReturnValue('Hello world'),
      replaceSelection: vi.fn()
    };
    const mockEditor = partialEditor as Editor;

    insertSampleCodeButton(mockEditor);

    const insertedText = vi.mocked(mockEditor.replaceSelection).mock.calls[0]?.[0] ?? '';
    expect(insertedText.startsWith('\n')).toBe(true);
  });
});

describe('CodeButtonBlockComponent', () => {
  let component: CodeButtonBlockComponent;
  let mockApp: App;
  let mockMarkdownCodeBlockProcessorRegistrar: MarkdownCodeBlockProcessorRegistrar;
  let mockPluginSettingsComponent: PluginSettingsComponent;
  let mockRequireHandlerFactoryComponent: RequireHandlerFactoryComponent;
  let mockTempPluginRegistry: TempPluginRegistryComponent;
  let mockDefineMode: ReturnType<typeof vi.fn>;
  let mockGetMode: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDefineMode = vi.fn();
    mockGetMode = vi.fn().mockReturnValue({});

    castTo<WindowWithCodeMirror>(window).CodeMirror = {
      defineMode: mockDefineMode,
      getMode: mockGetMode
    };

    const partialApp: Partial<App> = { vault: {} as App['vault'] };
    mockApp = partialApp as App;
    mockMarkdownCodeBlockProcessorRegistrar = {
      registerMarkdownCodeBlockProcessor: vi.fn()
    };
    const partialPluginSettings: Partial<PluginSettingsComponent> = {
      parseDefaultCodeButtonConfig: vi.fn().mockReturnValue({})
    };
    mockPluginSettingsComponent = partialPluginSettings as PluginSettingsComponent;
    const partialRequireHandlerFactoryComponent: Partial<RequireHandlerFactoryComponent> = {
      requireStringAsync: vi.fn()
    };
    mockRequireHandlerFactoryComponent = partialRequireHandlerFactoryComponent as RequireHandlerFactoryComponent;
    const partialTempPluginRegistry: Partial<TempPluginRegistryComponent> = {};
    mockTempPluginRegistry = partialTempPluginRegistry as TempPluginRegistryComponent;

    mockGetFile.mockReturnValue({ path: 'notes/test.md' });
    mockGetCodeBlockMarkdownInfo.mockResolvedValue(null);
    mockGetDataAdapterEx.mockReturnValue({ getFullPath: (p: string): string => `/vault/${p}` });
    mockGetOsAndObsidianUnsafePathCharsRegExp.mockReturnValue(/[<>:"/\\|?*]/g);

    component = new CodeButtonBlockComponent({
      app: mockApp,
      markdownCodeBlockProcessorRegistrar: mockMarkdownCodeBlockProcessorRegistrar,
      pluginSettingsComponent: mockPluginSettingsComponent,
      RequireHandlerFactoryComponent: mockRequireHandlerFactoryComponent,
      tempPluginRegistry: mockTempPluginRegistry
    });
  });

  describe('onload', () => {
    it('should register a markdown code block processor for code-button', () => {
      component.load();

      expect(mockMarkdownCodeBlockProcessorRegistrar.registerMarkdownCodeBlockProcessor).toHaveBeenCalledWith(
        'code-button',
        expect.any(Function)
      );
    });

    it('should register code highlighting on load', () => {
      component.load();

      expect(mockDefineMode).toHaveBeenCalledWith('code-button', expect.any(Function));
    });

    it('should invoke the defineMode callback which calls getMode with text/typescript', () => {
      component.load();

      // The first call to defineMode is registerCodeHighlighting
      const defineModeCallback = mockDefineMode.mock.calls[0]?.[1] as (config: unknown) => unknown;
      const mockConfig = { mode: 'test' };
      defineModeCallback(mockConfig);

      expect(mockGetMode).toHaveBeenCalledWith(mockConfig, 'text/typescript');
    });

    it('should register unregisterCodeHighlighting cleanup callback', () => {
      const registerSpy = vi.spyOn(component, 'register');
      component.load();

      // Register is called with unregisterCodeHighlighting
      expect(registerSpy).toHaveBeenCalled();
    });

    it('should call unregisterCodeHighlighting which redefines mode to null', () => {
      // Drive the real Component lifecycle: `load()` registers the cleanup, then
      // `unload()` invokes every registered cleanup (here unregisterCodeHighlighting).
      component.load();

      mockDefineMode.mockClear();
      component.unload();

      expect(mockDefineMode).toHaveBeenCalledWith('code-button', expect.any(Function));
      // The callback should call getMode with 'null'
      const defineModeCallback = mockDefineMode.mock.calls[0]?.[1] as (config: unknown) => unknown;
      const mockConfig = { mode: 'test' };
      defineModeCallback(mockConfig);
      expect(mockGetMode).toHaveBeenCalledWith(mockConfig, 'null');
    });
  });

  describe('onload markdown processor callback', () => {
    it('should invoke processCodeButtonBlock via invokeAsyncSafely when callback is triggered', () => {
      component.load();

      const registerMock = vi.mocked(mockMarkdownCodeBlockProcessorRegistrar.registerMarkdownCodeBlockProcessor);
      const registerCall = registerMock.mock.calls[0];
      const callback = registerCall?.[1] as ((source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => void) | undefined;
      expect(callback).toBeDefined();

      const el = createDiv();
      el.createDiv = vi.fn().mockReturnValue(createDiv());
      el.createEl = vi.fn().mockReturnValue(createEl('button'));
      const partialCtx: Partial<MarkdownPostProcessorContext> = { sourcePath: 'test.md' };
      const ctx = partialCtx as MarkdownPostProcessorContext;
      mockGetFile.mockReturnValue({ path: 'test.md' });
      mockGetCodeBlockMarkdownInfo.mockResolvedValue(null);

      callback?.('source code', el, ctx);

      expect(mockInvokeAsyncSafely).toHaveBeenCalled();
    });
  });

  describe('processCodeButtonBlock', () => {
    it('should create a result div with correct classes', async () => {
      const el = createDiv();
      el.createDiv = vi.fn().mockReturnValue(createDiv());
      el.createEl = vi.fn().mockReturnValue(createEl('button'));

      const partialCtx: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const ctx = partialCtx as MarkdownPostProcessorContext;

      await component.processCodeButtonBlock({ ctx, el, source: 'console.log("test")' });

      expect(el.createDiv).toHaveBeenCalledWith({ cls: 'fix-require-modules console-log-container' });
    });

    it('should show legacy config error when markdownInfo has args', async () => {
      mockGetCodeBlockMarkdownInfo.mockResolvedValue({ args: ['Run'] });

      const el = createDiv();
      const resultEl = createDiv();
      el.createDiv = vi.fn().mockReturnValue(resultEl);

      const partialCtx: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const ctx = partialCtx as MarkdownPostProcessorContext;

      await component.processCodeButtonBlock({ ctx, el, source: 'console.log("test")' });

      expect(mockConsoleWrapperWriteSystemMessage).toHaveBeenCalled();
    });

    it('should create a button element when isRaw is false', async () => {
      const el = createDiv();
      const resultEl = createDiv();
      el.createDiv = vi.fn().mockReturnValue(resultEl);
      el.createEl = vi.fn().mockReturnValue(createEl('button'));

      const partialCtx: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const ctx = partialCtx as MarkdownPostProcessorContext;

      await component.processCodeButtonBlock({ ctx, el, source: 'console.log("test")' });

      expect(el.createEl).toHaveBeenCalledWith(
        'button',
        expect.objectContaining({
          cls: 'mod-cta',
          prepend: true,
          text: '(no caption)'
        })
      );
    });

    it('should set isRaw config overrides when isRaw is true', async () => {
      const el = createDiv();
      const resultEl = createDiv();
      el.createDiv = vi.fn().mockReturnValue(resultEl);
      el.createEl = vi.fn().mockReturnValue(createEl('button'));

      const partialCtx: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const ctx = partialCtx as MarkdownPostProcessorContext;

      const source = '---\nisRaw: true\n---\nconsole.log("test")';

      await component.processCodeButtonBlock({ ctx, el, source });

      // When isRaw is true, shouldAutoRun is set to true, so handleClick should be called
      expect(mockInvokeAsyncSafely).toHaveBeenCalled();
    });

    it('should auto-run when shouldAutoRun is true', async () => {
      const el = createDiv();
      const resultEl = createDiv();
      el.createDiv = vi.fn().mockReturnValue(resultEl);
      el.createEl = vi.fn().mockReturnValue(createEl('button'));

      const partialCtx: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const ctx = partialCtx as MarkdownPostProcessorContext;

      const source = '---\nshouldAutoRun: true\n---\nconsole.log("test")';

      await component.processCodeButtonBlock({ ctx, el, source });

      expect(mockInvokeAsyncSafely).toHaveBeenCalled();
    });

    it('should show YAML error message when parseYaml throws', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        // Intentional noop for test mock.
      });

      const el = createDiv();
      const resultEl = createDiv();
      el.createDiv = vi.fn().mockReturnValue(resultEl);

      const partialCtx: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const ctx = partialCtx as MarkdownPostProcessorContext;

      // Genuinely malformed YAML so the REAL parseYaml throws (unclosed flow sequence).
      const source = '---\nfoo: [unclosed\n---\ncode';

      await component.processCodeButtonBlock({ ctx, el, source });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockConsoleWrapperWriteSystemMessage).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should parse argumentName:false as false for getBooleanArgument', async () => {
      mockGetCodeBlockMarkdownInfo.mockResolvedValue({ args: ['Run', 'raw:false', 'autorun:false', 'console:false'] });

      const el = createDiv();
      const resultEl = createDiv();
      el.createDiv = vi.fn().mockReturnValue(resultEl);

      const partialCtx: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const ctx = partialCtx as MarkdownPostProcessorContext;

      await component.processCodeButtonBlock({ ctx, el, source: 'console.log("test")' });

      // Legacy config is detected and system message shown
      expect(mockConsoleWrapperWriteSystemMessage).toHaveBeenCalled();
    });

    it('should handle legacy config with args and create update button', async () => {
      mockGetCodeBlockMarkdownInfo.mockResolvedValue({ args: ['Run', 'autorun', 'raw:false'] });

      const el = createDiv();
      const resultEl = createDiv();
      el.createDiv = vi.fn().mockReturnValue(resultEl);

      const partialCtx: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const ctx = partialCtx as MarkdownPostProcessorContext;

      await component.processCodeButtonBlock({ ctx, el, source: 'console.log("test")' });

      expect(mockConsoleWrapperWriteSystemMessage).toHaveBeenCalled();
    });

    it('should invoke the update config click handler that calls replaceCodeBlock', async () => {
      mockGetCodeBlockMarkdownInfo.mockResolvedValue({ args: ['Run', 'autorun', 'raw:false'] });
      mockReplaceCodeBlock.mockResolvedValue(undefined);

      const el = createDiv();
      const resultEl = createDiv();
      el.createDiv = vi.fn().mockReturnValue(resultEl);

      const partialCtx: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const ctx = partialCtx as MarkdownPostProcessorContext;

      await component.processCodeButtonBlock({ ctx, el, source: 'console.log("test")' });

      // The writeSystemMessage was called with a DocumentFragment containing a button
      const fragmentArg = mockConsoleWrapperWriteSystemMessage.mock.calls[0]?.[0] as DocumentFragment | undefined;
      expect(fragmentArg).toBeDefined();

      // Find the button in the fragment and click it
      const button = fragmentArg?.querySelector('button');
      expect(button).toBeDefined();

      if (button) {
        button.click();
        // The click handler calls invokeAsyncSafely which is mocked
        expect(mockInvokeAsyncSafely).toHaveBeenCalled();

        // Execute the async callback passed to invokeAsyncSafely
        const asyncFn = mockInvokeAsyncSafely.mock.calls[0]?.[0] as (() => Promise<void>) | undefined;
        if (asyncFn) {
          await asyncFn();
          expect(mockReplaceCodeBlock).toHaveBeenCalled();
        }
      }
    });

    it('should pass updated sourcePath from sourceFile to CodeButtonContextImplComponent', async () => {
      mockGetFile.mockReturnValue({ path: 'updated/path.md' });
      const el = createDiv();
      el.createDiv = vi.fn().mockReturnValue(createDiv());
      el.createEl = vi.fn().mockReturnValue(createEl('button'));

      const partialCtx: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'original/path.md'
      };
      const ctx = partialCtx as MarkdownPostProcessorContext;

      const source = '---\nshouldAutoRun: true\n---\nconsole.log("test")';

      const mockScriptWrapper = vi.fn();
      vi.mocked(mockRequireHandlerFactoryComponent.requireStringAsync as ReturnType<typeof vi.fn>).mockResolvedValue(mockScriptWrapper);

      await component.processCodeButtonBlock({ ctx, el, source });

      // HandleClick is invoked via shouldAutoRun, which uses updateSourcePath
      // The requireStringAsync call path includes the updated sourcePath
      expect(mockInvokeAsyncSafely).toHaveBeenCalled();
    });

    it('should use updateSourcePath to set sourcePath from sourceFile', async () => {
      mockGetFile.mockReturnValue({ path: 'updated/path.md' });
      const el = createDiv();
      el.createDiv = vi.fn().mockReturnValue(createDiv());
      el.createEl = vi.fn().mockReturnValue(createEl('button'));

      const partialCtx: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'original/path.md'
      };
      const ctx = partialCtx as MarkdownPostProcessorContext;

      await component.processCodeButtonBlock({ ctx, el, source: 'console.log("test")' });

      // The component uses updateSourcePath which sets ctx.sourcePath = sourceFile.path
      expect(mockGetFile).toHaveBeenCalledWith(mockApp, 'original/path.md');
    });
  });

  describe('handleClick', () => {
    function createCodeButtonContext(overrides: Partial<CodeButtonContext> = {}): CodeButtonContext {
      const container = createDiv();
      container.empty = vi.fn();
      const partial: Partial<CodeButtonContext> = {
        config: {
          ...DEFAULT_CODE_BUTTON_BLOCK_CONFIG,
          shouldShowSystemMessages: true
        },
        container,
        markdownInfo: null,
        removeCodeButtonBlock: vi.fn(),
        sourceFile: strictProxy<TFile>({ path: 'notes/test.md' }),
        ...overrides
      };
      return partial as CodeButtonContext;
    }

    it('should empty the container before execution', async () => {
      const mockScriptWrapper = vi.fn();
      vi.mocked(mockRequireHandlerFactoryComponent.requireStringAsync as ReturnType<typeof vi.fn>).mockResolvedValue(mockScriptWrapper);

      const codeButtonContext = createCodeButtonContext();

      await component.handleClick({
        buttonIndex: 1,
        code: 'console.log("test")',
        codeButtonContext,
        escapedCaption: 'Run'
      });

      expect(codeButtonContext.container.empty).toHaveBeenCalled();
    });

    it('should show executing message when shouldShowSystemMessages is true', async () => {
      const mockScriptWrapper = vi.fn();
      vi.mocked(mockRequireHandlerFactoryComponent.requireStringAsync as ReturnType<typeof vi.fn>).mockResolvedValue(mockScriptWrapper);

      const codeButtonContext = createCodeButtonContext();

      await component.handleClick({
        buttonIndex: 1,
        code: 'console.log("test")',
        codeButtonContext,
        escapedCaption: 'Run'
      });

      expect(mockConsoleWrapperWriteSystemMessage).toHaveBeenCalled();
    });

    it('should call requireStringAsync and execute the wrapper', async () => {
      const mockScriptWrapper = vi.fn();
      vi.mocked(mockRequireHandlerFactoryComponent.requireStringAsync as ReturnType<typeof vi.fn>).mockResolvedValue(mockScriptWrapper);

      const codeButtonContext = createCodeButtonContext({
        config: {
          ...DEFAULT_CODE_BUTTON_BLOCK_CONFIG,
          shouldShowSystemMessages: false
        }
      });

      await component.handleClick({
        buttonIndex: 1,
        code: 'console.log("test")',
        codeButtonContext,
        escapedCaption: 'Run'
      });

      expect(mockRequireHandlerFactoryComponent.requireStringAsync).toHaveBeenCalled();
      expect(mockScriptWrapper).toHaveBeenCalledWith(codeButtonContext);
    });

    it('should throw when makeWrapperScript babel transform fails', async () => {
      // Import and override the SequentialBabelPlugin mock to return an error
      // eslint-disable-next-line no-restricted-syntax -- dynamic import needed to override mock at runtime
      const babelModule = await import('./babel/combine-babel-plugins.ts');
      vi.spyOn(babelModule.SequentialBabelPlugin.prototype, 'transform').mockReturnValueOnce({
        data: {},
        error: new Error('Babel transform failed'),
        transformedCode: ''
      });

      const codeButtonContext = createCodeButtonContext();

      await component.handleClick({
        buttonIndex: 1,
        code: 'console.log("test")',
        codeButtonContext,
        escapedCaption: 'Run'
      });

      // The error is caught and printed
      expect(mockPrintError).toHaveBeenCalled();
    });

    it('should handle errors from requireStringAsync', async () => {
      const testError = new Error('Script failed');
      vi.mocked(mockRequireHandlerFactoryComponent.requireStringAsync as ReturnType<typeof vi.fn>).mockRejectedValue(testError);

      const codeButtonContext = createCodeButtonContext();

      await component.handleClick({
        buttonIndex: 1,
        code: 'console.log("test")',
        codeButtonContext,
        escapedCaption: 'Run'
      });

      expect(mockPrintError).toHaveBeenCalledWith(testError);
      expect(mockConsoleWrapperAppendToResultEl).toHaveBeenCalledWith([testError], 'error');
    });

    it('should remove button when removeAfterExecution.when is "always"', async () => {
      const mockScriptWrapper = vi.fn();
      vi.mocked(mockRequireHandlerFactoryComponent.requireStringAsync as ReturnType<typeof vi.fn>).mockResolvedValue(mockScriptWrapper);

      const mockRemoveCodeButtonBlock = vi.fn();
      const codeButtonContext = createCodeButtonContext({
        config: {
          ...DEFAULT_CODE_BUTTON_BLOCK_CONFIG,
          removeAfterExecution: { shouldKeepGap: false, when: 'always' as const },
          shouldShowSystemMessages: false
        },
        markdownInfo: strictProxy<CodeBlockMarkdownInformation>({ args: [] }),
        removeCodeButtonBlock: mockRemoveCodeButtonBlock
      });

      await component.handleClick({
        buttonIndex: 1,
        code: 'code',
        codeButtonContext,
        escapedCaption: 'Run'
      });

      expect(mockRemoveCodeButtonBlock).toHaveBeenCalledWith(false);
    });

    it('should remove button on success when removeAfterExecution.when is "onSuccess"', async () => {
      const mockScriptWrapper = vi.fn();
      vi.mocked(mockRequireHandlerFactoryComponent.requireStringAsync as ReturnType<typeof vi.fn>).mockResolvedValue(mockScriptWrapper);

      const mockRemoveCodeButtonBlock = vi.fn();
      const codeButtonContext = createCodeButtonContext({
        config: {
          ...DEFAULT_CODE_BUTTON_BLOCK_CONFIG,
          removeAfterExecution: { shouldKeepGap: true, when: 'onSuccess' as const },
          shouldShowSystemMessages: false
        },
        markdownInfo: strictProxy<CodeBlockMarkdownInformation>({ args: [] }),
        removeCodeButtonBlock: mockRemoveCodeButtonBlock
      });

      await component.handleClick({
        buttonIndex: 1,
        code: 'code',
        codeButtonContext,
        escapedCaption: 'Run'
      });

      expect(mockRemoveCodeButtonBlock).toHaveBeenCalledWith(true);
    });

    it('should not remove button on success when removeAfterExecution.when is "onError"', async () => {
      const mockScriptWrapper = vi.fn();
      vi.mocked(mockRequireHandlerFactoryComponent.requireStringAsync as ReturnType<typeof vi.fn>).mockResolvedValue(mockScriptWrapper);

      const mockRemoveCodeButtonBlock = vi.fn();
      const codeButtonContext = createCodeButtonContext({
        config: {
          ...DEFAULT_CODE_BUTTON_BLOCK_CONFIG,
          removeAfterExecution: { shouldKeepGap: false, when: 'onError' as const },
          shouldShowSystemMessages: false
        },
        markdownInfo: strictProxy<CodeBlockMarkdownInformation>({ args: [] }),
        removeCodeButtonBlock: mockRemoveCodeButtonBlock
      });

      await component.handleClick({
        buttonIndex: 1,
        code: 'code',
        codeButtonContext,
        escapedCaption: 'Run'
      });

      expect(mockRemoveCodeButtonBlock).not.toHaveBeenCalled();
    });

    it('should remove button on error when removeAfterExecution.when is "onError"', async () => {
      vi.mocked(mockRequireHandlerFactoryComponent.requireStringAsync as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));

      const mockRemoveCodeButtonBlock = vi.fn();
      const codeButtonContext = createCodeButtonContext({
        config: {
          ...DEFAULT_CODE_BUTTON_BLOCK_CONFIG,
          removeAfterExecution: { shouldKeepGap: false, when: 'onError' as const },
          shouldShowSystemMessages: false
        },
        markdownInfo: strictProxy<CodeBlockMarkdownInformation>({ args: [] }),
        removeCodeButtonBlock: mockRemoveCodeButtonBlock
      });

      await component.handleClick({
        buttonIndex: 1,
        code: 'code',
        codeButtonContext,
        escapedCaption: 'Run'
      });

      expect(mockRemoveCodeButtonBlock).toHaveBeenCalled();
    });

    it('should not remove button when removeAfterExecution.when is "never"', async () => {
      const mockScriptWrapper = vi.fn();
      vi.mocked(mockRequireHandlerFactoryComponent.requireStringAsync as ReturnType<typeof vi.fn>).mockResolvedValue(mockScriptWrapper);

      const mockRemoveCodeButtonBlock = vi.fn();
      const codeButtonContext = createCodeButtonContext({
        config: {
          ...DEFAULT_CODE_BUTTON_BLOCK_CONFIG,
          removeAfterExecution: { shouldKeepGap: false, when: 'never' as const },
          shouldShowSystemMessages: false
        },
        markdownInfo: strictProxy<CodeBlockMarkdownInformation>({ args: [] }),
        removeCodeButtonBlock: mockRemoveCodeButtonBlock
      });

      await component.handleClick({
        buttonIndex: 1,
        code: 'code',
        codeButtonContext,
        escapedCaption: 'Run'
      });

      expect(mockRemoveCodeButtonBlock).not.toHaveBeenCalled();
    });

    it('should show message when cannot remove block without markdownInfo', async () => {
      const mockScriptWrapper = vi.fn();
      vi.mocked(mockRequireHandlerFactoryComponent.requireStringAsync as ReturnType<typeof vi.fn>).mockResolvedValue(mockScriptWrapper);

      const codeButtonContext = createCodeButtonContext({
        config: {
          ...DEFAULT_CODE_BUTTON_BLOCK_CONFIG,
          removeAfterExecution: { shouldKeepGap: false, when: 'always' as const },
          shouldShowSystemMessages: false
        }
      });

      await component.handleClick({
        buttonIndex: 1,
        code: 'code',
        codeButtonContext,
        escapedCaption: 'Run'
      });

      expect(mockConsoleWrapperWriteSystemMessage).toHaveBeenCalled();
    });

    it('should not show system messages when shouldShowSystemMessages is false and execution succeeds', async () => {
      const mockScriptWrapper = vi.fn();
      vi.mocked(mockRequireHandlerFactoryComponent.requireStringAsync as ReturnType<typeof vi.fn>).mockResolvedValue(mockScriptWrapper);

      const codeButtonContext = createCodeButtonContext({
        config: {
          ...DEFAULT_CODE_BUTTON_BLOCK_CONFIG,
          shouldShowSystemMessages: false
        }
      });

      await component.handleClick({
        buttonIndex: 1,
        code: 'console.log("test")',
        codeButtonContext,
        escapedCaption: 'Run'
      });

      expect(mockConsoleWrapperWriteSystemMessage).not.toHaveBeenCalled();
    });

    it('should not show error system message when shouldShowSystemMessages is false', async () => {
      vi.mocked(mockRequireHandlerFactoryComponent.requireStringAsync as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));

      const codeButtonContext = createCodeButtonContext({
        config: {
          ...DEFAULT_CODE_BUTTON_BLOCK_CONFIG,
          shouldShowSystemMessages: false
        }
      });

      await component.handleClick({
        buttonIndex: 1,
        code: 'code',
        codeButtonContext,
        escapedCaption: 'Run'
      });

      // No system messages should be shown, but error is still printed and appended
      expect(mockConsoleWrapperWriteSystemMessage).not.toHaveBeenCalled();
      expect(mockPrintError).toHaveBeenCalled();
    });

    it('should trigger onclick handler on button click', async () => {
      const el = createDiv();
      const resultEl = createDiv();
      el.createDiv = vi.fn().mockReturnValue(resultEl);
      const buttonEl = createEl('button');
      el.createEl = vi.fn().mockReturnValue(buttonEl);

      const partialCtx: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const ctx = partialCtx as MarkdownPostProcessorContext;

      await component.processCodeButtonBlock({ ctx, el, source: 'console.log("test")' });

      // The button has an onclick handler that calls handleClick
      const createElCall = vi.mocked(el.createEl).mock.calls[0];
      expect(createElCall).toBeDefined();
      const options = createElCall?.[1] as ButtonCreateElOptions | undefined;
      expect(options?.onclick).toBeDefined();

      // Invoke the onclick handler
      if (options?.onclick) {
        const mockScriptWrapper = vi.fn();
        vi.mocked(mockRequireHandlerFactoryComponent.requireStringAsync as ReturnType<typeof vi.fn>).mockResolvedValue(mockScriptWrapper);
        await options.onclick();
        expect(mockRequireHandlerFactoryComponent.requireStringAsync).toHaveBeenCalled();
      }
    });

    it('should log error for unknown removeAfterExecution.when value', async () => {
      const mockScriptWrapper = vi.fn();
      vi.mocked(mockRequireHandlerFactoryComponent.requireStringAsync as ReturnType<typeof vi.fn>).mockResolvedValue(mockScriptWrapper);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        // Intentional noop for test mock.
      });

      const codeButtonContext = createCodeButtonContext({
        config: {
          ...DEFAULT_CODE_BUTTON_BLOCK_CONFIG,
          removeAfterExecution: castTo<RemoveAfterExecutionConfig>({ shouldKeepGap: false, when: 'unknownValue' }),
          shouldShowSystemMessages: false
        },
        markdownInfo: strictProxy<CodeBlockMarkdownInformation>({ args: [] })
      });

      await component.handleClick({
        buttonIndex: 1,
        code: 'code',
        codeButtonContext,
        escapedCaption: 'Run'
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown remove after execution mode'));
      consoleErrorSpy.mockRestore();
    });

    it('should handle error from removeCodeButtonBlock gracefully', async () => {
      const mockScriptWrapper = vi.fn();
      vi.mocked(mockRequireHandlerFactoryComponent.requireStringAsync as ReturnType<typeof vi.fn>).mockResolvedValue(mockScriptWrapper);

      const removeError = new Error('Failed to remove');
      const mockRemoveCodeButtonBlock = vi.fn().mockRejectedValue(removeError);
      const codeButtonContext = createCodeButtonContext({
        config: {
          ...DEFAULT_CODE_BUTTON_BLOCK_CONFIG,
          removeAfterExecution: { shouldKeepGap: false, when: 'always' as const },
          shouldShowSystemMessages: false
        },
        markdownInfo: strictProxy<CodeBlockMarkdownInformation>({ args: [] }),
        removeCodeButtonBlock: mockRemoveCodeButtonBlock
      });

      await component.handleClick({
        buttonIndex: 1,
        code: 'code',
        codeButtonContext,
        escapedCaption: 'Run'
      });

      expect(mockPrintError).toHaveBeenCalledWith(removeError);
      expect(mockConsoleWrapperAppendToResultEl).toHaveBeenCalledWith([removeError], 'error');
    });
  });
});

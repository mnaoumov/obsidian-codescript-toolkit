import type {
  App,
  Editor,
  MarkdownPostProcessorContext,
  TFile
} from 'obsidian';
import type { CodeBlockMarkdownInformation } from 'obsidian-dev-utils/obsidian/code-block-markdown-information';
import type { MarkdownCodeBlockProcessorRegistrar } from 'obsidian-dev-utils/obsidian/markdown-code-block-processor-registrar';
import type { ResourceLockComponent } from 'obsidian-dev-utils/obsidian/resource-lock';

import { Menu } from 'obsidian';
import { waitForAllAsyncOperations } from 'obsidian-dev-utils/async';
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
// eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/07 Code buttons in depth/43 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
import type { TempPluginRegistryComponent } from './temp-plugin-registry.ts';

import { SourceVisibility } from './code-button-block-config.ts';
import {
  CodeButtonBlockComponent,
  DEFAULT_CODE_BUTTON_BLOCK_CONFIG,
  insertSampleCodeButton
} from './code-button-block.ts';

const mockGetFile = vi.fn();
const mockGetCodeBlockMarkdownInfo = vi.fn();
const mockReplaceCodeBlock = vi.fn();
const mockPrintError = vi.fn();
const mockGetDataAdapterEx = vi.fn();
const mockGetOsAndObsidianUnsafePathCharsRegExp = vi.fn();
const mockResourceLockComponent = castTo<ResourceLockComponent>({});

interface BabelTransformResult {
  readonly error: Error | undefined;
  readonly transformedCode: string;
}

interface CodeButtonBlockComponentPrivateApi {
  handleClick(...$arguments: never[]): Promise<void>;
  processCodeButtonBlock(...$arguments: never[]): Promise<void>;
}

vi.mock('obsidian-dev-utils/error', () => ({
  printError: (...$arguments: unknown[]): unknown => mockPrintError(...$arguments)
}));

vi.mock('obsidian-dev-utils/obsidian/file-system', () => ({
  getFile: (...$arguments: unknown[]): unknown => mockGetFile(...$arguments)
}));

vi.mock('obsidian-dev-utils/obsidian/markdown-code-block-processor', () => ({
  getCodeBlockMarkdownInfo: (...$arguments: unknown[]): unknown => mockGetCodeBlockMarkdownInfo(...$arguments),
  replaceCodeBlock: (...$arguments: unknown[]): unknown => mockReplaceCodeBlock(...$arguments)
}));

vi.mock('obsidian-dev-utils/obsidian/validation', () => ({
  getOsAndObsidianUnsafePathCharsRegExp: (...$arguments: unknown[]): unknown => mockGetOsAndObsidianUnsafePathCharsRegExp(...$arguments)
}));

vi.mock('@obsidian-typings/obsidian-public-latest/implementations', () => ({
  getDataAdapterEx: (...$arguments: unknown[]): unknown => mockGetDataAdapterEx(...$arguments)
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
    public appendToResultEl(...$arguments: unknown[]): void {
      mockConsoleWrapperAppendToResultEl(...$arguments);
    }

    public getConsoleInstance(): Console {
      return console;
    }

    public writeSystemMessage(...$arguments: unknown[]): void {
      mockConsoleWrapperWriteSystemMessage(...$arguments);
    }
  }
}));

interface MockConstructorParams {
  readonly app: unknown;
  readonly buttonEl: HTMLButtonElement | null;
  readonly config: CodeButtonBlockConfig;
  readonly markdownInfo: unknown;
  readonly markdownPostProcessorContext: unknown;
  readonly parentEl: HTMLElement;
  readonly source: string;
}

interface MockCreateElOptions {
  onclick(): Promise<void>;
}

interface MockSourceFile {
  path: string;
}

const mockCodeButtonContextConstructor = vi.fn();

vi.mock('./code-button-context-impl.ts', () => ({
  CodeButtonContextImplComponent: class MockCodeButtonContextImplComponent {
    public readonly app: unknown;
    public readonly buttonEl: HTMLButtonElement | null;
    public readonly config: CodeButtonBlockConfig;
    public readonly container: HTMLElement;
    public readonly markdownInfo: unknown;
    public readonly markdownPostProcessorContext: unknown;
    public readonly parentEl: HTMLElement;
    public readonly removeCodeButtonBlock = vi.fn();
    public readonly source: string;
    public readonly sourceFile: MockSourceFile;

    public constructor(params: MockConstructorParams) {
      mockCodeButtonContextConstructor(params);
      this.app = params.app;
      this.buttonEl = params.buttonEl;
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
  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/07 Code buttons in depth/43 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  TempPluginRegistry: vi.fn()
}));

describe('DEFAULT_CODE_BUTTON_BLOCK_CONFIG', () => {
  it('should have caption "(no caption)"', () => {
    expect(DEFAULT_CODE_BUTTON_BLOCK_CONFIG.caption).toBe('(no caption)');
  });

  it('should have css empty', () => {
    expect(DEFAULT_CODE_BUTTON_BLOCK_CONFIG.css).toBe('');
  });

  it('should have cssClasses empty', () => {
    expect(DEFAULT_CODE_BUTTON_BLOCK_CONFIG.cssClasses).toBe('');
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

  it('should have shouldAutoScrollToConsoleMessages true', () => {
    expect(DEFAULT_CODE_BUTTON_BLOCK_CONFIG.shouldAutoScrollToConsoleMessages).toBe(true);
  });

  it('should have shouldShowSystemMessages true', () => {
    expect(DEFAULT_CODE_BUTTON_BLOCK_CONFIG.shouldShowSystemMessages).toBe(true);
  });

  it('should have shouldWrapConsole true', () => {
    expect(DEFAULT_CODE_BUTTON_BLOCK_CONFIG.shouldWrapConsole).toBe(true);
  });

  it('should have sourceVisibility Hidden', () => {
    expect(DEFAULT_CODE_BUTTON_BLOCK_CONFIG.sourceVisibility).toBe(SourceVisibility.Hidden);
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

// `mockApp` is built without a workspace; the reveal-in-note tests attach a stub one.
interface AppWithWorkspace {
  workspace: unknown;
}

// The obsidian-test-mocks `Menu` / `MenuItem` record what production code added to them under
// `__`-suffixed members. Reading them is how a unit test inspects a menu that is never really shown.
interface MockMenu {
  readonly menuItems__: MockMenuItem[];
}

interface MockMenuItem {
  readonly onClick__: ((event: MouseEvent) => unknown) | null;
  readonly title__: string;
}

describe('CodeButtonBlockComponent', () => {
  let component: CodeButtonBlockComponent;
  let mockApp: App;
  let mockMarkdownCodeBlockProcessorRegistrar: MarkdownCodeBlockProcessorRegistrar;
  let mockPluginSettingsComponent: PluginSettingsComponent;
  let mockRequireHandlerFactoryComponent: RequireHandlerFactoryComponent;
  let mockTemporaryPluginRegistry: TempPluginRegistryComponent;

  beforeEach(() => {
    vi.clearAllMocks();

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
    const partialTemporaryPluginRegistry: Partial<TempPluginRegistryComponent> = {};
    mockTemporaryPluginRegistry = partialTemporaryPluginRegistry as TempPluginRegistryComponent;

    mockGetFile.mockReturnValue({ path: 'notes/test.md' });
    mockGetCodeBlockMarkdownInfo.mockResolvedValue(null);
    mockGetDataAdapterEx.mockReturnValue({ getFullPath: (p: string): string => `/vault/${p}` });
    mockGetOsAndObsidianUnsafePathCharsRegExp.mockReturnValue(/[<>:"/\\|?*]/g);

    component = new CodeButtonBlockComponent({
      app: mockApp,
      markdownCodeBlockProcessorRegistrar: mockMarkdownCodeBlockProcessorRegistrar,
      pluginSettingsComponent: mockPluginSettingsComponent,
      RequireHandlerFactoryComponent: mockRequireHandlerFactoryComponent,
      resourceLockComponent: mockResourceLockComponent,
      // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/07 Code buttons in depth/43 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
      tempPluginRegistry: mockTemporaryPluginRegistry
    });
  });

  describe('onload', () => {
    it('should register a markdown code block processor for code-button', () => {
      component.load();

      expect(mockMarkdownCodeBlockProcessorRegistrar.registerMarkdownCodeBlockProcessor).toHaveBeenCalledWith({
        handler: expect.any(Function) as unknown,
        language: 'code-button'
      });
    });
  });

  describe('onload markdown processor callback', () => {
    it('should invoke processCodeButtonBlock via invokeAsyncSafely when callback is triggered', async () => {
      component.load();

      const registerMock = vi.mocked(mockMarkdownCodeBlockProcessorRegistrar.registerMarkdownCodeBlockProcessor);
      const registerCall = registerMock.mock.calls[0];
      const callback = registerCall?.[0]?.handler as ((source: string, el: HTMLElement, context: MarkdownPostProcessorContext) => void) | undefined;
      expect(callback).toBeDefined();

      const el = createDiv();
      el.createDiv = vi.fn().mockReturnValue(createDiv());
      el.createEl = vi.fn().mockReturnValue(createEl('button'));
      const partialContext: Partial<MarkdownPostProcessorContext> = { sourcePath: 'test.md' };
      const context = partialContext as MarkdownPostProcessorContext;
      mockGetFile.mockReturnValue({ path: 'test.md' });
      mockGetCodeBlockMarkdownInfo.mockResolvedValue(null);

      const processSpy = vi.spyOn(castTo<CodeButtonBlockComponentPrivateApi>(component), 'processCodeButtonBlock');

      callback?.('source code', el, context);

      // The callback schedules processCodeButtonBlock via the real invokeAsyncSafely (fire-and-forget).
      // Drain the tracked operation before asserting.
      await waitForAllAsyncOperations();

      expect(processSpy).toHaveBeenCalled();
    });
  });

  describe('processCodeButtonBlock', () => {
    it('should create a result div with correct classes', async () => {
      const el = createDiv();
      el.createDiv = vi.fn().mockReturnValue(createDiv());
      el.createEl = vi.fn().mockReturnValue(createEl('button'));

      const partialContext: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const context = partialContext as MarkdownPostProcessorContext;

      await component['processCodeButtonBlock']({ context, el, source: 'console.log("test")' });

      expect(el.createDiv).toHaveBeenCalledWith({ cls: 'fix-require-modules console-log-container' });
    });

    it('should show legacy config error when markdownInfo has args', async () => {
      mockGetCodeBlockMarkdownInfo.mockResolvedValue({ $arguments: ['Run'] });

      const el = createDiv();
      const resultEl = createDiv();
      el.createDiv = vi.fn().mockReturnValue(resultEl);

      const partialContext: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const context = partialContext as MarkdownPostProcessorContext;

      await component['processCodeButtonBlock']({ context, el, source: 'console.log("test")' });

      expect(mockConsoleWrapperWriteSystemMessage).toHaveBeenCalled();
    });

    it('should create a button element when isRaw is false', async () => {
      const el = createDiv();
      const resultEl = createDiv();
      el.createDiv = vi.fn().mockReturnValue(resultEl);
      el.createEl = vi.fn().mockReturnValue(createEl('button'));

      const partialContext: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const context = partialContext as MarkdownPostProcessorContext;

      await component['processCodeButtonBlock']({ context, el, source: 'console.log("test")' });

      expect(el.createEl).toHaveBeenCalledWith(
        'button',
        expect.objectContaining({
          cls: 'mod-cta fix-require-modules-run-button',
          prepend: true,
          text: '(no caption)'
        })
      );
    });

    it('should apply css to the button element', async () => {
      const el = createDiv();
      const buttonEl = createEl('button');
      el.createDiv = vi.fn().mockReturnValue(createDiv());
      el.createEl = vi.fn().mockReturnValue(buttonEl);

      const partialContext: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const context = partialContext as MarkdownPostProcessorContext;

      const source = '---\ncss: "color: red; margin-top: 10px"\n---\nconsole.log("test")';

      await component['processCodeButtonBlock']({ context, el, source });

      expect(buttonEl.style.color).toBe('red');
      expect(buttonEl.style.marginTop).toBe('10px');
    });

    it('should leave the button style untouched when css is omitted', async () => {
      const el = createDiv();
      const buttonEl = createEl('button');
      el.createDiv = vi.fn().mockReturnValue(createDiv());
      el.createEl = vi.fn().mockReturnValue(buttonEl);

      const partialContext: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const context = partialContext as MarkdownPostProcessorContext;

      await component['processCodeButtonBlock']({ context, el, source: 'console.log("test")' });

      expect(buttonEl.style.cssText).toBe('');
    });

    it('should add cssClasses given as a space-separated string to the button element', async () => {
      const el = createDiv();
      const buttonEl = createEl('button');
      el.createDiv = vi.fn().mockReturnValue(createDiv());
      el.createEl = vi.fn().mockReturnValue(buttonEl);

      const partialContext: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const context = partialContext as MarkdownPostProcessorContext;

      const source = '---\ncssClasses: my-button my-other-button\n---\nconsole.log("test")';

      await component['processCodeButtonBlock']({ context, el, source });

      expect(buttonEl.classList.contains('my-button')).toBe(true);
      expect(buttonEl.classList.contains('my-other-button')).toBe(true);
    });

    it('should add cssClasses given as a list to the button element', async () => {
      const el = createDiv();
      const buttonEl = createEl('button');
      el.createDiv = vi.fn().mockReturnValue(createDiv());
      el.createEl = vi.fn().mockReturnValue(buttonEl);

      const partialContext: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const context = partialContext as MarkdownPostProcessorContext;

      const source = '---\ncssClasses:\n  - my-button\n  - my-other-button\n---\nconsole.log("test")';

      await component['processCodeButtonBlock']({ context, el, source });

      expect(buttonEl.classList.contains('my-button')).toBe(true);
      expect(buttonEl.classList.contains('my-other-button')).toBe(true);
    });

    it('should add no classes beyond the built-in ones when cssClasses is omitted', async () => {
      const el = createDiv();
      const buttonEl = createEl('button');
      el.createDiv = vi.fn().mockReturnValue(createDiv());
      el.createEl = vi.fn().mockReturnValue(buttonEl);

      const partialContext: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const context = partialContext as MarkdownPostProcessorContext;

      await component['processCodeButtonBlock']({ context, el, source: 'console.log("test")' });

      expect([...buttonEl.classList]).toEqual([]);
    });

    it('should pass the button element to the code button context', async () => {
      const el = createDiv();
      const buttonEl = createEl('button');
      el.createDiv = vi.fn().mockReturnValue(createDiv());
      el.createEl = vi.fn().mockReturnValue(buttonEl);

      const partialContext: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const context = partialContext as MarkdownPostProcessorContext;

      vi.spyOn(castTo<CodeButtonBlockComponentPrivateApi>(component), 'handleClick').mockResolvedValue(undefined);

      await component['processCodeButtonBlock']({ context, el, source: 'console.log("test")' });

      const createElOptions = vi.mocked(el.createEl).mock.calls[0]?.[1] as MockCreateElOptions | undefined;
      await createElOptions?.onclick();

      expect(mockCodeButtonContextConstructor).toHaveBeenCalledWith(
        expect.objectContaining({ buttonEl })
      );
    });

    it('should pass a null button element to the code button context for a raw button', async () => {
      const el = createDiv();
      el.createDiv = vi.fn().mockReturnValue(createDiv());
      el.createEl = vi.fn().mockReturnValue(createEl('button'));

      const partialContext: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const context = partialContext as MarkdownPostProcessorContext;

      vi.spyOn(castTo<CodeButtonBlockComponentPrivateApi>(component), 'handleClick').mockResolvedValue(undefined);

      await component['processCodeButtonBlock']({ context, el, source: '---\nisRaw: true\n---\nconsole.log("test")' });
      await waitForAllAsyncOperations();

      expect(mockCodeButtonContextConstructor).toHaveBeenCalledWith(
        expect.objectContaining({ buttonEl: null })
      );
    });

    it('should show a context menu with Copy source when the run button is right-clicked', async () => {
      const el = createDiv();
      const buttonEl = createEl('button');
      el.createDiv = vi.fn().mockReturnValue(createDiv());
      el.createEl = vi.fn().mockReturnValue(buttonEl);

      const partialContext: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const context = partialContext as MarkdownPostProcessorContext;

      const shownMenus: MockMenu[] = [];
      vi.spyOn(Menu.prototype, 'showAtMouseEvent').mockImplementation(function mockShowAtMouseEvent(this: Menu): Menu {
        shownMenus.push(castTo<MockMenu>(this));
        return this;
      });

      await component['processCodeButtonBlock']({ context, el, source: 'console.log("test")' });

      buttonEl.dispatchEvent(new MouseEvent('contextmenu'));

      expect(shownMenus[0]?.menuItems__.map((item) => item.title__)).toEqual(['Copy source']);
    });

    it('should copy the trimmed source to the clipboard from the context menu', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('activeWindow', { navigator: { clipboard: { writeText } } });

      const el = createDiv();
      const buttonEl = createEl('button');
      el.createDiv = vi.fn().mockReturnValue(createDiv());
      el.createEl = vi.fn().mockReturnValue(buttonEl);

      const partialContext: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const context = partialContext as MarkdownPostProcessorContext;

      const shownMenus: MockMenu[] = [];
      vi.spyOn(Menu.prototype, 'showAtMouseEvent').mockImplementation(function mockShowAtMouseEvent(this: Menu): Menu {
        shownMenus.push(castTo<MockMenu>(this));
        return this;
      });

      await component['processCodeButtonBlock']({ context, el, source: 'console.log("test")' });

      buttonEl.dispatchEvent(new MouseEvent('contextmenu'));
      shownMenus[0]?.menuItems__[0]?.onClick__?.(new MouseEvent('click'));
      await waitForAllAsyncOperations();

      expect(writeText).toHaveBeenCalledWith('console.log("test")');

      vi.unstubAllGlobals();
    });

    it('should reveal the block in the note from the context menu', async () => {
      mockGetCodeBlockMarkdownInfo.mockResolvedValue({ $arguments: [], sectionInfo: { lineStart: 7 } });

      const setCursor = vi.fn();
      const setState = vi.fn().mockResolvedValue(undefined);
      const getActiveViewOfType = vi.fn().mockReturnValue({
        editor: { setCursor },
        getState: vi.fn().mockReturnValue({ file: 'notes/test.md', mode: 'preview' }),
        setState
      });
      castTo<AppWithWorkspace>(mockApp).workspace = { getActiveViewOfType };

      const el = createDiv();
      const buttonEl = createEl('button');
      el.createDiv = vi.fn().mockReturnValue(createDiv());
      el.createEl = vi.fn().mockReturnValue(buttonEl);

      const partialContext: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const context = partialContext as MarkdownPostProcessorContext;

      const shownMenus: MockMenu[] = [];
      vi.spyOn(Menu.prototype, 'showAtMouseEvent').mockImplementation(function mockShowAtMouseEvent(this: Menu): Menu {
        shownMenus.push(castTo<MockMenu>(this));
        return this;
      });

      await component['processCodeButtonBlock']({ context, el, source: 'console.log("test")' });

      buttonEl.dispatchEvent(new MouseEvent('contextmenu'));

      const revealItem = shownMenus[0]?.menuItems__[1];
      expect(revealItem?.title__).toBe('Reveal in note');

      revealItem?.onClick__?.(new MouseEvent('click'));
      await waitForAllAsyncOperations();

      expect(setState).toHaveBeenCalledWith({ file: 'notes/test.md', mode: 'source' }, { history: false });
      expect(setCursor).toHaveBeenCalledWith({ ch: 0, line: 7 });
    });

    it('should notice instead of revealing when there is no active note', async () => {
      mockGetCodeBlockMarkdownInfo.mockResolvedValue({ $arguments: [], sectionInfo: { lineStart: 7 } });

      const getActiveViewOfType = vi.fn().mockReturnValue(null);
      castTo<AppWithWorkspace>(mockApp).workspace = { getActiveViewOfType };

      const el = createDiv();
      const buttonEl = createEl('button');
      el.createDiv = vi.fn().mockReturnValue(createDiv());
      el.createEl = vi.fn().mockReturnValue(buttonEl);

      const partialContext: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const context = partialContext as MarkdownPostProcessorContext;

      const shownMenus: MockMenu[] = [];
      vi.spyOn(Menu.prototype, 'showAtMouseEvent').mockImplementation(function mockShowAtMouseEvent(this: Menu): Menu {
        shownMenus.push(castTo<MockMenu>(this));
        return this;
      });

      await component['processCodeButtonBlock']({ context, el, source: 'console.log("test")' });

      buttonEl.dispatchEvent(new MouseEvent('contextmenu'));
      shownMenus[0]?.menuItems__[1]?.onClick__?.(new MouseEvent('click'));
      await waitForAllAsyncOperations();

      expect(getActiveViewOfType).toHaveBeenCalled();
    });

    it('should not create a source panel when sourceVisibility is hidden', async () => {
      const el = createDiv();
      el.createDiv = vi.fn().mockReturnValue(createDiv());
      el.createEl = vi.fn().mockReturnValue(createEl('button'));

      const partialContext: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const context = partialContext as MarkdownPostProcessorContext;

      await component['processCodeButtonBlock']({ context, el, source: 'console.log("test")' });

      expect(el.createDiv).not.toHaveBeenCalledWith(expect.objectContaining({ cls: 'fix-require-modules code-button-source-container' }));
    });

    it('should create a source panel and a toggle when sourceVisibility is collapsed', async () => {
      const el = createDiv();
      el.createDiv = vi.fn().mockReturnValue(createDiv());
      el.createEl = vi.fn().mockReturnValue(createEl('button'));

      const partialContext: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const context = partialContext as MarkdownPostProcessorContext;

      const source = '---\nsourceVisibility: collapsed\n---\nconsole.log("test")';

      await component['processCodeButtonBlock']({ context, el, source });

      expect(el.createDiv).toHaveBeenCalledWith({ cls: 'fix-require-modules code-button-source-container', prepend: true });
      expect(el.createDiv).toHaveBeenCalledWith({ cls: 'fix-require-modules code-button-source-toggle clickable-icon', prepend: true });
    });

    it('should not create a source panel for a raw button even when sourceVisibility is expanded', async () => {
      const el = createDiv();
      el.createDiv = vi.fn().mockReturnValue(createDiv());
      el.createEl = vi.fn().mockReturnValue(createEl('button'));

      const partialContext: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const context = partialContext as MarkdownPostProcessorContext;

      const source = '---\nisRaw: true\nsourceVisibility: expanded\n---\nconsole.log("test")';

      vi.spyOn(castTo<CodeButtonBlockComponentPrivateApi>(component), 'handleClick').mockResolvedValue(undefined);

      await component['processCodeButtonBlock']({ context, el, source });
      await waitForAllAsyncOperations();

      expect(el.createDiv).not.toHaveBeenCalledWith(expect.objectContaining({ cls: 'fix-require-modules code-button-source-container' }));
    });

    it('should start collapsed and expand the source panel when the toggle is clicked', async () => {
      const el = createDiv();
      const sourceEl = createDiv();
      const toggleEl = createDiv();
      el.createDiv = vi.fn()
        .mockReturnValueOnce(createDiv())
        .mockReturnValueOnce(sourceEl)
        .mockReturnValueOnce(toggleEl);
      el.createEl = vi.fn().mockReturnValue(createEl('button'));

      const partialContext: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const context = partialContext as MarkdownPostProcessorContext;

      const source = '---\nsourceVisibility: collapsed\n---\nconsole.log("test")';

      await component['processCodeButtonBlock']({ context, el, source });

      expect(sourceEl.classList.contains('is-collapsed')).toBe(true);

      toggleEl.click();

      expect(sourceEl.classList.contains('is-collapsed')).toBe(false);
    });

    it('should start expanded when sourceVisibility is expanded', async () => {
      const el = createDiv();
      const sourceEl = createDiv();
      el.createDiv = vi.fn()
        .mockReturnValueOnce(createDiv())
        .mockReturnValueOnce(sourceEl)
        .mockReturnValueOnce(createDiv());
      el.createEl = vi.fn().mockReturnValue(createEl('button'));

      const partialContext: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const context = partialContext as MarkdownPostProcessorContext;

      const source = '---\nsourceVisibility: expanded\n---\nconsole.log("test")';

      await component['processCodeButtonBlock']({ context, el, source });

      expect(sourceEl.classList.contains('is-collapsed')).toBe(false);
    });

    it('should set isRaw config overrides when isRaw is true', async () => {
      const el = createDiv();
      const resultEl = createDiv();
      el.createDiv = vi.fn().mockReturnValue(resultEl);
      el.createEl = vi.fn().mockReturnValue(createEl('button'));

      const partialContext: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const context = partialContext as MarkdownPostProcessorContext;

      const source = '---\nisRaw: true\n---\nconsole.log("test")';

      const handleClickSpy = vi.spyOn(castTo<CodeButtonBlockComponentPrivateApi>(component), 'handleClick').mockResolvedValue(undefined);

      await component['processCodeButtonBlock']({ context, el, source });

      // When isRaw is true, shouldAutoRun is set to true, so handleClick is scheduled via the real
      // Fire-and-forget invokeAsyncSafely. Drain the tracked operation before asserting.
      await waitForAllAsyncOperations();
      expect(handleClickSpy).toHaveBeenCalled();
    });

    it('should auto-run when shouldAutoRun is true', async () => {
      const el = createDiv();
      const resultEl = createDiv();
      el.createDiv = vi.fn().mockReturnValue(resultEl);
      el.createEl = vi.fn().mockReturnValue(createEl('button'));

      const partialContext: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const context = partialContext as MarkdownPostProcessorContext;

      const source = '---\nshouldAutoRun: true\n---\nconsole.log("test")';

      const handleClickSpy = vi.spyOn(castTo<CodeButtonBlockComponentPrivateApi>(component), 'handleClick').mockResolvedValue(undefined);

      await component['processCodeButtonBlock']({ context, el, source });

      // Auto-run schedules handleClick via the real invokeAsyncSafely (fire-and-forget).
      // Drain the tracked operation before asserting.
      await waitForAllAsyncOperations();
      expect(handleClickSpy).toHaveBeenCalled();
    });

    it('should show YAML error message when parseYaml throws', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        // Intentional noop for test mock.
      });

      const el = createDiv();
      const resultEl = createDiv();
      el.createDiv = vi.fn().mockReturnValue(resultEl);

      const partialContext: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const context = partialContext as MarkdownPostProcessorContext;

      // Genuinely malformed YAML so the REAL parseYaml throws (unclosed flow sequence).
      const source = '---\nfoo: [unclosed\n---\ncode';

      await component['processCodeButtonBlock']({ context, el, source });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockConsoleWrapperWriteSystemMessage).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should parse argumentName:false as false for getBooleanArgument', async () => {
      mockGetCodeBlockMarkdownInfo.mockResolvedValue({ $arguments: ['Run', 'raw:false', 'autorun:false', 'console:false'] });

      const el = createDiv();
      const resultEl = createDiv();
      el.createDiv = vi.fn().mockReturnValue(resultEl);

      const partialContext: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const context = partialContext as MarkdownPostProcessorContext;

      await component['processCodeButtonBlock']({ context, el, source: 'console.log("test")' });

      // Legacy config is detected and system message shown
      expect(mockConsoleWrapperWriteSystemMessage).toHaveBeenCalled();
    });

    it('should handle legacy config with args and create update button', async () => {
      mockGetCodeBlockMarkdownInfo.mockResolvedValue({ $arguments: ['Run', 'autorun', 'raw:false'] });

      const el = createDiv();
      const resultEl = createDiv();
      el.createDiv = vi.fn().mockReturnValue(resultEl);

      const partialContext: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const context = partialContext as MarkdownPostProcessorContext;

      await component['processCodeButtonBlock']({ context, el, source: 'console.log("test")' });

      expect(mockConsoleWrapperWriteSystemMessage).toHaveBeenCalled();
    });

    it('should invoke the update config click handler that calls replaceCodeBlock', async () => {
      mockGetCodeBlockMarkdownInfo.mockResolvedValue({ $arguments: ['Run', 'autorun', 'raw:false'] });
      mockReplaceCodeBlock.mockResolvedValue(undefined);

      const el = createDiv();
      const resultEl = createDiv();
      el.createDiv = vi.fn().mockReturnValue(resultEl);

      const partialContext: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const context = partialContext as MarkdownPostProcessorContext;

      await component['processCodeButtonBlock']({ context, el, source: 'console.log("test")' });

      // The writeSystemMessage was called with a DocumentFragment containing a button
      const fragmentArgument = mockConsoleWrapperWriteSystemMessage.mock.calls[0]?.[0] as DocumentFragment | undefined;
      expect(fragmentArgument).toBeDefined();

      // Find the button in the fragment and click it
      const button = fragmentArgument?.querySelector('button');
      expect(button).toBeDefined();

      expect(button).not.toBeNull();
      button?.click();

      // The click handler schedules its work via the real invokeAsyncSafely (fire-and-forget).
      // Drain the tracked operation before asserting the observable effect.
      await waitForAllAsyncOperations();

      expect(mockReplaceCodeBlock).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceLockComponent: mockResourceLockComponent
        })
      );
    });

    it('should pass updated sourcePath from sourceFile to CodeButtonContextImplComponent', async () => {
      mockGetFile.mockReturnValue({ path: 'updated/path.md' });
      const el = createDiv();
      el.createDiv = vi.fn().mockReturnValue(createDiv());
      el.createEl = vi.fn().mockReturnValue(createEl('button'));

      const partialContext: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'original/path.md'
      };
      const context = partialContext as MarkdownPostProcessorContext;

      const source = '---\nshouldAutoRun: true\n---\nconsole.log("test")';

      const mockScriptWrapper = vi.fn();
      vi.mocked(mockRequireHandlerFactoryComponent.requireStringAsync as ReturnType<typeof vi.fn>).mockResolvedValue(mockScriptWrapper);

      const handleClickSpy = vi.spyOn(castTo<CodeButtonBlockComponentPrivateApi>(component), 'handleClick').mockResolvedValue(undefined);

      await component['processCodeButtonBlock']({ context, el, source });

      // Auto-run schedules handleClick (which uses the updated sourcePath) via the real
      // Fire-and-forget invokeAsyncSafely. Drain the tracked operation before asserting.
      await waitForAllAsyncOperations();
      expect(handleClickSpy).toHaveBeenCalled();
    });

    it('should use updateSourcePath to set sourcePath from sourceFile', async () => {
      mockGetFile.mockReturnValue({ path: 'updated/path.md' });
      const el = createDiv();
      el.createDiv = vi.fn().mockReturnValue(createDiv());
      el.createEl = vi.fn().mockReturnValue(createEl('button'));

      const partialContext: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'original/path.md'
      };
      const context = partialContext as MarkdownPostProcessorContext;

      await component['processCodeButtonBlock']({ context, el, source: 'console.log("test")' });

      // The component uses updateSourcePath which sets context.sourcePath = sourceFile.path
      expect(mockGetFile).toHaveBeenCalledWith({ app: mockApp, pathOrFile: 'original/path.md' });
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

      await component['handleClick']({
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

      await component['handleClick']({
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

      await component['handleClick']({
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
      const babelModule = await import('./babel/combine-babel-plugins.ts');
      vi.spyOn(babelModule.SequentialBabelPlugin.prototype, 'transform').mockReturnValueOnce({
        data: {},
        error: new Error('Babel transform failed'),
        transformedCode: ''
      });

      const codeButtonContext = createCodeButtonContext();

      await component['handleClick']({
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

      await component['handleClick']({
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
        markdownInfo: strictProxy<CodeBlockMarkdownInformation>({ $arguments: [] }),
        removeCodeButtonBlock: mockRemoveCodeButtonBlock
      });

      await component['handleClick']({
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
        markdownInfo: strictProxy<CodeBlockMarkdownInformation>({ $arguments: [] }),
        removeCodeButtonBlock: mockRemoveCodeButtonBlock
      });

      await component['handleClick']({
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
        markdownInfo: strictProxy<CodeBlockMarkdownInformation>({ $arguments: [] }),
        removeCodeButtonBlock: mockRemoveCodeButtonBlock
      });

      await component['handleClick']({
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
        markdownInfo: strictProxy<CodeBlockMarkdownInformation>({ $arguments: [] }),
        removeCodeButtonBlock: mockRemoveCodeButtonBlock
      });

      await component['handleClick']({
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
        markdownInfo: strictProxy<CodeBlockMarkdownInformation>({ $arguments: [] }),
        removeCodeButtonBlock: mockRemoveCodeButtonBlock
      });

      await component['handleClick']({
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

      await component['handleClick']({
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

      await component['handleClick']({
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

      await component['handleClick']({
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

      const partialContext: Partial<MarkdownPostProcessorContext> = {
        sourcePath: 'notes/test.md'
      };
      const context = partialContext as MarkdownPostProcessorContext;

      await component['processCodeButtonBlock']({ context, el, source: 'console.log("test")' });

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
        markdownInfo: strictProxy<CodeBlockMarkdownInformation>({ $arguments: [] })
      });

      await component['handleClick']({
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
        markdownInfo: strictProxy<CodeBlockMarkdownInformation>({ $arguments: [] }),
        removeCodeButtonBlock: mockRemoveCodeButtonBlock
      });

      await component['handleClick']({
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

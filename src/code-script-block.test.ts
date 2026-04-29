import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import {
  CODE_SCRIPT_BLOCK_LANGUAGE,
  CodeScriptBlockComponent
} from './code-script-block.ts';

interface CodeMirrorApi {
  defineMode: ReturnType<typeof vi.fn>;
  getMode: ReturnType<typeof vi.fn>;
}

interface WindowWithCodeMirror {
  CodeMirror: CodeMirrorApi;
}

const mockLoadPrism = vi.fn();

vi.mock('obsidian-typings/implementations', () => ({
  loadPrism: (...args: unknown[]): unknown => mockLoadPrism(...args)
}));

describe('CODE_SCRIPT_BLOCK_LANGUAGE', () => {
  it('should equal "code-script"', () => {
    expect(CODE_SCRIPT_BLOCK_LANGUAGE).toBe('code-script');
  });
});

describe('CodeScriptBlockComponent', () => {
  let component: CodeScriptBlockComponent;
  let mockDefineMode: ReturnType<typeof vi.fn>;
  let mockGetMode: ReturnType<typeof vi.fn>;
  let prismLanguages: Record<string, unknown>;

  beforeEach(() => {
    mockDefineMode = vi.fn();
    mockGetMode = vi.fn().mockReturnValue({});
    prismLanguages = {
      typescript: { tokenize: vi.fn() }
    };

    const windowWithCodeMirror = window as typeof window & WindowWithCodeMirror;
    windowWithCodeMirror.CodeMirror = {
      defineMode: mockDefineMode,
      getMode: mockGetMode
    } as never;

    mockLoadPrism.mockResolvedValue({ languages: prismLanguages });
    component = new CodeScriptBlockComponent();
  });

  describe('onload', () => {
    async function loadComponent(comp: CodeScriptBlockComponent): Promise<void> {
      // eslint-disable-next-line no-restricted-syntax -- accessing private property for test setup
      const componentRecord = comp as unknown as Record<string, boolean>;
      componentRecord['loaded__'] = true;
      await comp.onload();
    }

    it('should define CodeMirror mode for code-script', async () => {
      await loadComponent(component);

      expect(mockDefineMode).toHaveBeenCalledWith(CODE_SCRIPT_BLOCK_LANGUAGE, expect.any(Function));
    });

    it('should call CodeMirror.getMode with text/typescript when the mode factory is invoked', async () => {
      await loadComponent(component);

      const modeFactory = mockDefineMode.mock.calls[0]?.[1] as ((config: object) => unknown) | undefined;
      const mockConfig = { indentUnit: 2 };
      modeFactory?.(mockConfig);

      expect(mockGetMode).toHaveBeenCalledWith(mockConfig, 'text/typescript');
    });

    it('should register code-script language in Prism', async () => {
      await loadComponent(component);

      expect(prismLanguages[CODE_SCRIPT_BLOCK_LANGUAGE]).toBe(prismLanguages['typescript']);
    });

    it('should throw if Prism typescript language is not found', async () => {
      prismLanguages = {};
      mockLoadPrism.mockResolvedValue({ languages: prismLanguages });

      await expect(loadComponent(component)).rejects.toThrow('Prism typescript language not found.');
    });

    it('should register cleanup that resets CodeMirror mode to null', async () => {
      await loadComponent(component);

      component.unload();

      const CLEANUP_CALL_INDEX = 1;
      const cleanupModeFactory = mockDefineMode.mock.calls[CLEANUP_CALL_INDEX]?.[1] as ((config: object) => unknown) | undefined;
      const mockConfig = { indentUnit: 2 };
      cleanupModeFactory?.(mockConfig);

      expect(mockDefineMode.mock.calls[CLEANUP_CALL_INDEX]?.[0]).toBe(CODE_SCRIPT_BLOCK_LANGUAGE);
      expect(mockGetMode).toHaveBeenCalledWith(mockConfig, 'null');
    });

    it('should register cleanup that removes code-script from Prism languages', async () => {
      await loadComponent(component);

      expect(prismLanguages[CODE_SCRIPT_BLOCK_LANGUAGE]).toBeDefined();

      component.unload();

      expect(prismLanguages[CODE_SCRIPT_BLOCK_LANGUAGE]).toBeUndefined();
    });
  });
});

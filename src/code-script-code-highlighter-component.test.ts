import type {
  Cm5EditorConfiguration,
  Cm5Mode,
  Cm5ModeFactory,
  CodeMirrorModule,
  Grammar,
  PrismModule
} from '@obsidian-typings/obsidian-public-latest';

import { castTo } from 'obsidian-dev-utils/object-utils';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import {
  CODE_SCRIPT_BLOCK_LANGUAGE,
  CodeScriptCodeHighlighterComponent
} from './code-script-code-highlighter-component.ts';

interface Mocks {
  getMode: ReturnType<typeof createGetModeMock>;
  modes: CodeMirrorModule['modes'];
  prism: PrismModule;
}

const { loadPrismMock } = vi.hoisted(() => ({
  loadPrismMock: vi.fn()
}));

vi.mock('@obsidian-typings/obsidian-public-latest/implementations', () => ({
  loadPrism: loadPrismMock
}));

const TYPESCRIPT_GRAMMAR: Grammar = { keyword: /\bconst\b/ };

describe('CODE_SCRIPT_BLOCK_LANGUAGE', () => {
  it('should equal "code-script"', () => {
    expect(CODE_SCRIPT_BLOCK_LANGUAGE).toBe('code-script');
  });
});

describe('CodeScriptCodeHighlighterComponent', () => {
  let mocks: Mocks;
  let component: CodeScriptCodeHighlighterComponent;

  beforeEach(() => {
    mocks = createMocks();
    mocks.prism.languages['typescript'] = TYPESCRIPT_GRAMMAR;
    component = new CodeScriptCodeHighlighterComponent();
  });

  describe('onloadAsync', () => {
    it('should register the editor mode for code-script', async () => {
      await component.loadWithPromises();

      expect(mocks.modes[CODE_SCRIPT_BLOCK_LANGUAGE]).toBeDefined();
    });

    it('should highlight the fence as TypeScript in the editor', async () => {
      await component.loadWithPromises();

      const config = castTo<Cm5EditorConfiguration>({ indentUnit: 2 });
      mocks.modes[CODE_SCRIPT_BLOCK_LANGUAGE]?.(config);

      expect(mocks.getMode).toHaveBeenCalledWith(config, 'text/typescript');
    });

    it('should alias the code-script Prism language to typescript', async () => {
      await component.loadWithPromises();

      expect(mocks.prism.languages[CODE_SCRIPT_BLOCK_LANGUAGE]).toBe(TYPESCRIPT_GRAMMAR);
    });

    it('should throw when the typescript Prism language is not registered', async () => {
      delete mocks.prism.languages['typescript'];

      await expect(component.loadWithPromises()).rejects.toMatchObject({
        errors: [expect.objectContaining({ message: 'Prism language "typescript" is not registered.' })]
      });
    });

    it('should remove the editor mode and the Prism language when unloaded', async () => {
      await component.loadWithPromises();

      component.unload();

      expect(CODE_SCRIPT_BLOCK_LANGUAGE in mocks.modes).toBe(false);
      expect(CODE_SCRIPT_BLOCK_LANGUAGE in mocks.prism.languages).toBe(false);
    });
  });
});

function createGetModeMock(): ReturnType<typeof vi.fn<(config: Cm5EditorConfiguration, modeSpec: string) => Cm5Mode<unknown>>> {
  return vi.fn<(config: Cm5EditorConfiguration, modeSpec: string) => Cm5Mode<unknown>>(() => castTo<Cm5Mode<unknown>>({}));
}

/**
 * Builds the two Obsidian runtime globals the base `SyntaxHighlightingComponent` talks to.
 *
 * Neither is modeled by `obsidian-test-mocks` — its `loadPrism` resolves to an empty object and there is no
 * `window.CodeMirror` at all — so supplementing them here is the sanctioned test double, mirroring the base
 * component's own suite in `obsidian-dev-utils`. `strictProxy` is deliberately NOT used: reading a
 * not-yet-registered language or mode as `undefined` is exactly the behavior under test.
 *
 * @returns The mocked registries.
 */
function createMocks(): Mocks {
  const modes: CodeMirrorModule['modes'] = {};
  const getMode = createGetModeMock();

  window.CodeMirror = castTo<CodeMirrorModule>({
    defineMode: (name: string, modeFactory: Cm5ModeFactory<unknown>): void => {
      modes[name] = modeFactory;
    },
    getMode,
    modes
  });

  const prism = castTo<PrismModule>({ languages: {} });
  loadPrismMock.mockReset();
  loadPrismMock.mockResolvedValue(prism);

  return { getMode, modes, prism };
}

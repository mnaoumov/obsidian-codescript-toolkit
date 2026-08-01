import type {
  Cm5EditorConfiguration,
  Cm5Mode,
  Cm5ModeFactory,
  CodeMirrorModule,
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
  CODE_BUTTON_BLOCK_LANGUAGE,
  CodeButtonCodeHighlighterComponent
} from './code-button-code-highlighter-component.ts';

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

describe('CODE_BUTTON_BLOCK_LANGUAGE', () => {
  it('should equal "code-button"', () => {
    expect(CODE_BUTTON_BLOCK_LANGUAGE).toBe('code-button');
  });
});

describe('CodeButtonCodeHighlighterComponent', () => {
  let mocks: Mocks;
  let component: CodeButtonCodeHighlighterComponent;

  beforeEach(() => {
    mocks = createMocks();
    component = new CodeButtonCodeHighlighterComponent();
  });

  describe('onloadAsync', () => {
    it('should register the editor mode for code-button', async () => {
      await component.loadWithPromises();

      expect(mocks.modes[CODE_BUTTON_BLOCK_LANGUAGE]).toBeDefined();
    });

    it('should highlight the fence as TypeScript in the editor', async () => {
      await component.loadWithPromises();

      const config = castTo<Cm5EditorConfiguration>({ indentUnit: 2 });
      mocks.modes[CODE_BUTTON_BLOCK_LANGUAGE]?.(config);

      expect(mocks.getMode).toHaveBeenCalledWith(config, 'text/typescript');
    });

    it('should not register a Prism language, as the fence is replaced by a button in reading view', async () => {
      await component.loadWithPromises();

      expect(loadPrismMock).not.toHaveBeenCalled();
      expect(CODE_BUTTON_BLOCK_LANGUAGE in mocks.prism.languages).toBe(false);
    });

    it('should remove the editor mode when unloaded', async () => {
      await component.loadWithPromises();

      component.unload();

      expect(CODE_BUTTON_BLOCK_LANGUAGE in mocks.modes).toBe(false);
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

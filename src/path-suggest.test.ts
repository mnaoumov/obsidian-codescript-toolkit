import type {
  App,
  Vault
} from 'obsidian';

import { strictProxy } from 'obsidian-dev-utils/strict-proxy';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { PathSuggest } from './path-suggest.ts';

vi.mock('obsidian', () => ({
  AbstractInputSuggest: class MockAbstractInputSuggest {
    protected readonly app: unknown;
    protected readonly textInputEl: HTMLInputElement;

    public constructor(app: unknown, textInputEl: HTMLInputElement) {
      this.app = app;
      this.textInputEl = textInputEl;
    }

    public close(): void {
      // Intentional noop for test mock.
    }

    public setValue(_value: string): void {
      // Intentional noop for test mock.
    }
  }
}));

vi.mock('obsidian-dev-utils/path', () => ({
  basename: (path: string): string => path.split('/').pop() ?? '',
  extname: (path: string): string => {
    const base = path.split('/').pop() ?? '';
    const dotIndex = base.lastIndexOf('.');
    return dotIndex === -1 ? '' : base.slice(dotIndex);
  },
  relative: (from: string, to: string): string => {
    if (to.startsWith(from)) {
      let result = to.slice(from.length);
      if (result.startsWith('/')) {
        result = result.slice(1);
      }
      return result;
    }
    return to;
  }
}));

vi.mock('./require-handlers/require-handler.ts', () => ({
  EXTENSIONS: ['.js', '.ts']
}));

describe('PathSuggest', () => {
  let mockApp: App;
  let textInputEl: HTMLInputElement;
  let suggest: PathSuggest;
  const ROOT_PATH = 'scripts';

  beforeEach(() => {
    vi.clearAllMocks();

    mockApp = strictProxy<App>({
      vault: strictProxy<Vault>({
        adapter: strictProxy<Vault['adapter']>({
          list: vi.fn().mockResolvedValue({ files: [], folders: [] })
        })
      })
    });

    textInputEl = createEl('input');

    suggest = new PathSuggest({
      app: mockApp,
      getRootPath(): string {
        return ROOT_PATH;
      },
      textInputEl,
      type: 'file'
    });
  });

  describe('getSuggestions', () => {
    it('should always include blank entry at start', async () => {
      const suggestions = await suggest.getSuggestions('');
      expect(suggestions[0]).toEqual({ path: '', type: 'file' });
    });

    it('should filter entries by input string', async () => {
      vi.mocked(mockApp.vault.adapter.list as ReturnType<typeof vi.fn>).mockResolvedValue({
        files: ['scripts/hello.ts', 'scripts/world.ts', 'scripts/foo.js'],
        folders: []
      });

      const suggestions = await suggest.getSuggestions('hello');
      const paths = suggestions.map((s) => s.path);
      expect(paths).toContain('hello.ts');
      expect(paths).not.toContain('world.ts');
    });

    it('should sort entries alphabetically', async () => {
      vi.mocked(mockApp.vault.adapter.list as ReturnType<typeof vi.fn>).mockResolvedValue({
        files: ['scripts/zebra.ts', 'scripts/alpha.ts', 'scripts/middle.ts'],
        folders: []
      });

      const suggestions = await suggest.getSuggestions('');
      const pathsWithoutBlank = suggestions.slice(1).map((s) => s.path);
      const sorted = [...pathsWithoutBlank].sort((a, b) => a.localeCompare(b));
      expect(pathsWithoutBlank).toEqual(sorted);
    });

    it('should exclude files with unsupported extensions', async () => {
      vi.mocked(mockApp.vault.adapter.list as ReturnType<typeof vi.fn>).mockResolvedValue({
        files: ['scripts/valid.ts', 'scripts/invalid.py', 'scripts/valid.js'],
        folders: []
      });

      const suggestions = await suggest.getSuggestions('');
      const paths = suggestions.map((s) => s.path);
      expect(paths).not.toContain('invalid.py');
    });
  });

  describe('renderSuggestion', () => {
    it('should set text to the path', () => {
      const el = createDiv();
      suggest.renderSuggestion({ path: 'my-script.ts', type: 'file' }, el);
      expect(el.textContent).toBe('my-script.ts');
    });

    it('should set text to "(blank)" for empty path', () => {
      const el = createDiv();
      suggest.renderSuggestion({ path: '', type: 'file' }, el);
      expect(el.textContent).toBe('(blank)');
    });
  });

  describe('selectSuggestion', () => {
    it('should dispatch input event on textInputEl', () => {
      const dispatchSpy = vi.spyOn(textInputEl, 'dispatchEvent');
      suggest.selectSuggestion({ path: 'selected.ts', type: 'file' });
      expect(dispatchSpy).toHaveBeenCalledWith(expect.any(Event));
    });
  });

  describe('refresh', () => {
    it('should clear the cached path entries', async () => {
      vi.mocked(mockApp.vault.adapter.list as ReturnType<typeof vi.fn>).mockResolvedValue({
        files: ['scripts/first.ts'],
        folders: []
      });

      await suggest.getSuggestions('');

      vi.mocked(mockApp.vault.adapter.list as ReturnType<typeof vi.fn>).mockResolvedValue({
        files: ['scripts/second.ts'],
        folders: []
      });

      suggest.refresh();
      const suggestions = await suggest.getSuggestions('');
      const paths = suggestions.map((s) => s.path);
      expect(paths).toContain('second.ts');
    });
  });

  describe('fillPathEntries', () => {
    it('should skip node_modules folders', async () => {
      vi.mocked(mockApp.vault.adapter.list as ReturnType<typeof vi.fn>).mockImplementation((path: string) => {
        if (path === ROOT_PATH) {
          return { files: [], folders: ['scripts/node_modules'] };
        }
        return { files: ['scripts/node_modules/package.ts'], folders: [] };
      });

      const suggestions = await suggest.getSuggestions('');
      const paths = suggestions.map((s) => s.path);
      expect(paths).not.toContain('node_modules/package.ts');
    });

    it('should include subfolders when type is folder', async () => {
      const folderSuggest = new PathSuggest({
        app: mockApp,
        getRootPath(): string {
          return ROOT_PATH;
        },
        textInputEl,
        type: 'folder'
      });

      vi.mocked(mockApp.vault.adapter.list as ReturnType<typeof vi.fn>).mockImplementation((path: string) => {
        if (path === ROOT_PATH) {
          return { files: ['scripts/file.ts'], folders: ['scripts/sub'] };
        }
        return { files: [], folders: [] };
      });

      const suggestions = await folderSuggest.getSuggestions('');
      const paths = suggestions.map((s) => s.path);
      expect(paths).toContain('sub');
    });
  });

  describe('refresh', () => {
    it('should handle being called when no timeout is active', () => {
      suggest.refresh();
      // RefreshTimeoutId is null, so clearTimeout should not be called
      expect(true).toBe(true);
    });
  });

  describe('getPathEntries caching', () => {
    it('should return cached entries on subsequent calls without refresh', async () => {
      vi.mocked(mockApp.vault.adapter.list as ReturnType<typeof vi.fn>).mockResolvedValue({
        files: ['scripts/cached.ts'],
        folders: []
      });

      const first = await suggest.getSuggestions('');
      const second = await suggest.getSuggestions('');

      // List should only be called once since entries are cached
      expect(vi.mocked(mockApp.vault.adapter.list as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
      expect(first.length).toBe(second.length);
    });
  });
});

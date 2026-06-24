import type { App } from 'obsidian';

import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import {
  CodeScriptToolkitNoteSettings,
  getCodeScriptToolkitNoteSettings,
  getCodeScriptToolkitNoteSettingsFromContent
} from './code-script-toolkit-note-settings.ts';

const mockIsMarkdownFile = vi.fn<(path: string) => boolean>();
const mockParseFrontmatter = vi.fn();
const mockGetFrontmatterSafe = vi.fn();

vi.mock('obsidian-dev-utils/obsidian/file-system', () => ({
  isMarkdownFile: (...args: unknown[]): unknown => mockIsMarkdownFile(...args as [string])
}));

vi.mock('obsidian-dev-utils/obsidian/frontmatter', () => ({
  parseFrontmatter: (...args: unknown[]): unknown => mockParseFrontmatter(...args)
}));

vi.mock('obsidian-dev-utils/obsidian/metadata-cache', () => ({
  getFrontmatterSafe: (...args: unknown[]): unknown => mockGetFrontmatterSafe(...args)
}));

interface CreateMockAppOptions {
  readonly fileByPath?: null | object;
  readonly readContent?: string;
}

function createMockApp(options?: CreateMockAppOptions): App {
  const adapterPartial: Partial<App['vault']['adapter']> = {
    read: vi.fn().mockResolvedValue(options?.readContent ?? '')
  };
  const vaultPartial: Partial<App['vault']> = {
    adapter: adapterPartial as App['vault']['adapter'],
    getFileByPath: vi.fn().mockReturnValue(options?.fileByPath ?? null)
  };
  const partial: Partial<App> = {
    vault: vaultPartial as App['vault']
  };
  return partial as App;
}

describe('CodeScriptToolkitNoteSettings', () => {
  it('should have correct default values', () => {
    const settings = new CodeScriptToolkitNoteSettings();
    expect(settings.defaultCodeScriptName).toBe('');
    expect(settings.invocableCodeScriptName).toBe('');
    expect(settings.isInvocable).toBe(false);
  });
});

describe('getCodeScriptToolkitNoteSettings', () => {
  it('should return default settings when path is not a markdown file', async () => {
    const app = createMockApp();
    mockIsMarkdownFile.mockReturnValue(false);

    const result = await getCodeScriptToolkitNoteSettings(app, 'test.txt');

    expect(result).toEqual(new CodeScriptToolkitNoteSettings());
  });

  it('should return frontmatter settings when file exists in vault', async () => {
    const mockFile = { path: 'test.md' };
    const app = createMockApp({ fileByPath: mockFile });
    mockIsMarkdownFile.mockReturnValue(true);
    const expectedSettings = new CodeScriptToolkitNoteSettings();
    expectedSettings.isInvocable = true;
    mockGetFrontmatterSafe.mockResolvedValue({ codeScriptToolkit: expectedSettings });

    const result = await getCodeScriptToolkitNoteSettings(app, 'test.md');

    expect(result).toBe(expectedSettings);
  });

  it('should return default settings when file exists but frontmatter has no codeScriptToolkit', async () => {
    const mockFile = { path: 'test.md' };
    const app = createMockApp({ fileByPath: mockFile });
    mockIsMarkdownFile.mockReturnValue(true);
    mockGetFrontmatterSafe.mockResolvedValue({});

    const result = await getCodeScriptToolkitNoteSettings(app, 'test.md');

    expect(result).toEqual(new CodeScriptToolkitNoteSettings());
  });

  it('should parse content when file is not in vault', async () => {
    const app = createMockApp({ readContent: '---\ncodeScriptToolkit:\n  isInvocable: true\n---' });
    mockIsMarkdownFile.mockReturnValue(true);
    const expectedSettings = new CodeScriptToolkitNoteSettings();
    expectedSettings.isInvocable = true;
    mockParseFrontmatter.mockReturnValue({ codeScriptToolkit: expectedSettings });

    const result = await getCodeScriptToolkitNoteSettings(app, 'test.md');

    expect(result).toBe(expectedSettings);
  });

  it('should return default settings when content has no codeScriptToolkit frontmatter', async () => {
    const app = createMockApp({ readContent: '---\ntitle: test\n---' });
    mockIsMarkdownFile.mockReturnValue(true);
    mockParseFrontmatter.mockReturnValue({});

    const result = await getCodeScriptToolkitNoteSettings(app, 'test.md');

    expect(result).toEqual(new CodeScriptToolkitNoteSettings());
  });
});

describe('getCodeScriptToolkitNoteSettingsFromContent', () => {
  it('should return settings from frontmatter when codeScriptToolkit is present', () => {
    const expectedSettings = new CodeScriptToolkitNoteSettings();
    expectedSettings.defaultCodeScriptName = 'myScript';
    mockParseFrontmatter.mockReturnValue({ codeScriptToolkit: expectedSettings });

    const result = getCodeScriptToolkitNoteSettingsFromContent('---\ncodeScriptToolkit:\n  defaultCodeScriptName: myScript\n---');

    expect(result).toBe(expectedSettings);
  });

  it('should return default settings when frontmatter has no codeScriptToolkit', () => {
    mockParseFrontmatter.mockReturnValue({});

    const result = getCodeScriptToolkitNoteSettingsFromContent('---\ntitle: test\n---');

    expect(result).toEqual(new CodeScriptToolkitNoteSettings());
  });
});

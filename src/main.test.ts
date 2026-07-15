import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

vi.mock('./styles/main.scss', () => ({}));

vi.mock('./plugin.ts', () => ({
  Plugin: vi.fn()
}));

describe('main', () => {
  it('should re-export the Plugin class from plugin.ts as the default export', async () => {
    const mainModule = await import('./main.ts');
    const pluginModule = await import('./plugin.ts');
    expect(mainModule.default).toBe(pluginModule.Plugin);
  });
});

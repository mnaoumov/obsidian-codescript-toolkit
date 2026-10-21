import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { WrapForCodeBlockBabelPlugin } from './wrap-for-code-block-babel-plugin.ts';

const TEST_FILENAME = 'test.ts';

interface RunResult {
  readonly logged: unknown[][];
}

function createPlugin(shouldAutoOutput: boolean, shouldAutoOutputUndefined = false): WrapForCodeBlockBabelPlugin {
  return new WrapForCodeBlockBabelPlugin({ shouldAutoOutput, shouldAutoOutputUndefined });
}

async function run(plugin: WrapForCodeBlockBabelPlugin, code: string): Promise<RunResult> {
  const result = plugin.transform({ code, filename: TEST_FILENAME });
  expect(result.error).toBeUndefined();

  const logged: unknown[][] = [];
  const fakeConsole = {
    log: vi.fn((...loggedValues: unknown[]) => {
      logged.push(loggedValues);
    })
  };
  const fakeWindow = { console: fakeConsole };
  const wrapperModule = { exports: undefined as unknown };
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func -- Runs the generated wrapper the way the plugin's require does, with `console` and `window` stubbed.
  const evaluateWrapper = new Function('module', 'window', 'console', result.transformedCode) as (wrapperModule: unknown, window: unknown, console: unknown) => void;
  evaluateWrapper(wrapperModule, fakeWindow, fakeConsole);
  await (wrapperModule.exports as (context: unknown) => Promise<void>)({ app: {}, console: fakeConsole });
  return { logged };
}

describe('WrapForCodeBlockBabelPlugin', () => {
  describe('shouldAutoOutput=true', () => {
    it('should wrap the last expression statement in console.log', () => {
      const plugin = createPlugin(true);
      const result = plugin.transform({ code: '1 + 2;', filename: TEST_FILENAME });
      expect(result.error).toBeUndefined();
      expect(result.transformedCode).toContain('console.log');
      expect(result.transformedCode).toContain('1 + 2');
    });

    it('should not wrap non-expression last statement (if statement)', () => {
      const plugin = createPlugin(true);
      const result = plugin.transform({ code: 'if (true) { console.log("hi"); }', filename: TEST_FILENAME });
      expect(result.error).toBeUndefined();
      expect(result.transformedCode).toContain('if');
      // The if statement should remain, not be wrapped in console.log
      expect(result.transformedCode).not.toMatch(/console\.log\(\s*if/);
    });

    it('should handle empty program body', () => {
      const plugin = createPlugin(true);
      const result = plugin.transform({ code: '', filename: TEST_FILENAME });
      expect(result.error).toBeUndefined();
      // With empty body + shouldAutoOutput, convertToExpression(undefined) returns identifier('undefined')
      expect(result.transformedCode).toContain('console.log');
    });

    it('should output a defined last value', async () => {
      const { logged } = await run(createPlugin(true), '1 + 2;\n5 + 6;');
      expect(logged).toEqual([[11]]);
    });

    it('should output an awaited last value', async () => {
      const { logged } = await run(createPlugin(true), 'await Promise.resolve(42);');
      expect(logged).toEqual([[42]]);
    });

    it('should output the settled value of an un-awaited last Promise', async () => {
      const { logged } = await run(createPlugin(true), 'Promise.resolve(42);');
      expect(logged).toEqual([[42]]);
    });

    it('should output the settled value of a last thenable', async () => {
      const { logged } = await run(createPlugin(true), '({ then(resolve) { resolve(\'settled\'); } });');
      expect(logged).toEqual([['settled']]);
    });

    it('should reject with the reason of an un-awaited last Promise', async () => {
      await expect(run(createPlugin(true), 'Promise.reject(new Error(\'boom\'));')).rejects.toThrow('boom');
    });

    it('should output null', async () => {
      const { logged } = await run(createPlugin(true), 'null;');
      expect(logged).toEqual([[null]]);
    });

    describe('shouldAutoOutputUndefined=false', () => {
      it('should not output an undefined last value', async () => {
        const { logged } = await run(createPlugin(true), 'await Promise.resolve();');
        expect(logged).toEqual([]);
      });

      it('should not output undefined after a trailing console.log', async () => {
        const { logged } = await run(createPlugin(true), 'console.log(\'x\');');
        expect(logged).toEqual([['x']]);
      });

      it('should not output anything for an empty block', async () => {
        const { logged } = await run(createPlugin(true), '');
        expect(logged).toEqual([]);
      });

      it('should not output an un-awaited last Promise that settles to undefined', async () => {
        const { logged } = await run(createPlugin(true), 'Promise.resolve();');
        expect(logged).toEqual([]);
      });

      it('should not clash with a script variable of the helper parameter name', async () => {
        const { logged } = await run(createPlugin(true), 'const __codeButtonAutoOutputValue = 5;\n__codeButtonAutoOutputValue + 1;');
        expect(logged).toEqual([[6]]);
      });
    });

    describe('shouldAutoOutputUndefined=true', () => {
      it('should output an undefined last value', async () => {
        const { logged } = await run(createPlugin(true, true), 'await Promise.resolve();');
        expect(logged).toEqual([[undefined]]);
      });

      it('should output undefined after a trailing console.log', async () => {
        const { logged } = await run(createPlugin(true, true), 'console.log(\'x\');');
        expect(logged).toEqual([['x'], [undefined]]);
      });
    });
  });

  describe('shouldAutoOutput=false', () => {
    it('should not wrap any statement in console.log', () => {
      const plugin = createPlugin(false);
      const result = plugin.transform({ code: '1 + 2;', filename: TEST_FILENAME });
      expect(result.error).toBeUndefined();
      // Console appears in the wrapper (for __console and window.console), but not as console.log wrapping the expression
      expect(result.transformedCode).not.toMatch(/console\.log\(1\s*\+\s*2\)/);
      expect(result.transformedCode).toContain('1 + 2');
    });

    it('should ignore shouldAutoOutputUndefined', async () => {
      const { logged } = await run(createPlugin(false, true), 'await Promise.resolve();');
      expect(logged).toEqual([]);
    });
  });

  describe('wrapper structure', () => {
    it('should wrap code in module.exports = function codeButtonBlockScriptWrapper', () => {
      const plugin = createPlugin(false);
      const result = plugin.transform({ code: 'const x = 1;', filename: TEST_FILENAME });
      expect(result.error).toBeUndefined();
      expect(result.transformedCode).toContain('module.exports');
      expect(result.transformedCode).toContain('codeButtonBlockScriptWrapper');
      expect(result.transformedCode).toContain('codeButtonContext');
    });

    it('should save and restore window.console in the wrapper', () => {
      const plugin = createPlugin(false);
      const result = plugin.transform({ code: 'const x = 1;', filename: TEST_FILENAME });
      expect(result.error).toBeUndefined();
      expect(result.transformedCode).toContain('__console');
      expect(result.transformedCode).toContain('window.console');
    });

    it('should declare app from codeButtonContext.app', () => {
      const plugin = createPlugin(false);
      const result = plugin.transform({ code: 'const x = 1;', filename: TEST_FILENAME });
      expect(result.error).toBeUndefined();
      expect(result.transformedCode).toContain('codeButtonContext.app');
    });

    it('should use try/finally to restore console', () => {
      const plugin = createPlugin(false);
      const result = plugin.transform({ code: 'const x = 1;', filename: TEST_FILENAME });
      expect(result.error).toBeUndefined();
      expect(result.transformedCode).toContain('try');
      expect(result.transformedCode).toContain('finally');
    });
  });
});

import { errorToString } from 'obsidian-dev-utils/error';
import { toJson } from 'obsidian-dev-utils/object-utils';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { ConsoleWrapper } from './console-wrapper.ts';

vi.mock('obsidian-dev-utils/error', () => ({
  errorToString: vi.fn((err: Error): string => `ErrorString:${err.message}`)
}));

vi.mock('obsidian-dev-utils/object-utils', () => ({
  FunctionHandlingMode: { NameOnly: 'NameOnly' },
  toJson: vi.fn((_obj: unknown): string => '{"mocked":"json"}')
}));

interface MockElement {
  createDiv: ReturnType<typeof vi.fn>;
  scrollIntoView: ReturnType<typeof vi.fn>;
}

function createMockElement(): MockElement {
  const childEl: MockElement = {
    createDiv: vi.fn(),
    scrollIntoView: vi.fn()
  };
  childEl.createDiv.mockReturnValue(childEl);
  return childEl;
}

describe('ConsoleWrapper', () => {
  let resultEl: MockElement;
  let wrapper: ConsoleWrapper;

  beforeEach(() => {
    resultEl = createMockElement();
    const partialResultEl: Partial<HTMLElement> = resultEl as Partial<HTMLElement>;
    wrapper = new ConsoleWrapper({ resultEl: partialResultEl as HTMLElement });
  });

  describe('appendToResultEl', () => {
    it('should create a div with formatted message and correct class', () => {
      wrapper.appendToResultEl(['hello'], 'log');

      expect(resultEl.createDiv).toHaveBeenCalledWith({
        cls: 'console-log-entry console-log-entry-log',
        text: 'hello'
      });
    });

    it('should join multiple args with space', () => {
      wrapper.appendToResultEl(['hello', 'world'], 'info');

      expect(resultEl.createDiv).toHaveBeenCalledWith({
        cls: 'console-log-entry console-log-entry-info',
        text: 'hello world'
      });
    });

    it('should use correct class for each console method', () => {
      const methods = ['debug', 'error', 'info', 'log', 'warn'] as const;

      for (const method of methods) {
        resultEl.createDiv.mockClear();
        wrapper.appendToResultEl(['msg'], method);
        expect(resultEl.createDiv).toHaveBeenCalledWith(
          expect.objectContaining({ cls: `console-log-entry console-log-entry-${method}` })
        );
      }
    });

    it('should scroll the log entry into view', () => {
      wrapper.appendToResultEl(['test'], 'log');

      expect(resultEl.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'nearest'
      });
    });
  });

  describe('formatMessage (via appendToResultEl)', () => {
    it('should return string args as-is', () => {
      wrapper.appendToResultEl(['plain string'], 'log');

      expect(resultEl.createDiv).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'plain string' })
      );
    });

    it('should call errorToString for Error args', () => {
      const error = new Error('test error');
      wrapper.appendToResultEl([error], 'error');

      expect(errorToString).toHaveBeenCalledWith(error);
      expect(resultEl.createDiv).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'ErrorString:test error' })
      );
    });

    it('should call toJson for object args', () => {
      const obj = { key: 'value' };
      wrapper.appendToResultEl([obj], 'log');

      expect(toJson).toHaveBeenCalledWith(
        obj,
        expect.objectContaining({
          functionHandlingMode: 'NameOnly',
          maxDepth: 0,
          shouldCatchToJSONErrors: true,
          shouldHandleCircularReferences: true,
          shouldHandleErrors: true,
          shouldHandleUndefined: true,
          shouldSortKeys: true
        })
      );
      expect(resultEl.createDiv).toHaveBeenCalledWith(
        expect.objectContaining({ text: '{"mocked":"json"}' })
      );
    });

    it('should call toJson for number args', () => {
      const num = 42;
      wrapper.appendToResultEl([num], 'log');

      expect(toJson).toHaveBeenCalledWith(num, expect.anything());
    });

    it('should format mixed args separated by spaces', () => {
      const error = new Error('err');
      wrapper.appendToResultEl(['prefix', error], 'warn');

      expect(resultEl.createDiv).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'prefix ErrorString:err' })
      );
    });
  });

  describe('getConsoleInstance', () => {
    it('should return the native console when shouldWrapConsole is false', () => {
      const result = wrapper.getConsoleInstance(false);
      expect(result).toBe(console);
    });

    it('should return a wrapped console when shouldWrapConsole is true', () => {
      const result = wrapper.getConsoleInstance(true);
      expect(result).not.toBe(console);
    });

    it('should delegate to original console and appendToResultEl on wrapped log', () => {
      // eslint-disable-next-line no-console, obsidianmd/rule-custom-message -- testing console wrapper behavior
      const originalLog = console.log;
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {
        // Intentional noop for test mock.
      });

      try {
        const wrappedConsole = wrapper.getConsoleInstance(true);
        wrappedConsole.log('test message');

        expect(logSpy).toHaveBeenCalledWith('test message');
        expect(resultEl.createDiv).toHaveBeenCalledWith(
          expect.objectContaining({ cls: 'console-log-entry console-log-entry-log' })
        );
      } finally {
        logSpy.mockRestore();
        // eslint-disable-next-line no-console, obsidianmd/rule-custom-message -- restoring original console.log
        console.log = originalLog;
      }
    });

    it('should wrap all five console methods', () => {
      const methods = ['log', 'debug', 'error', 'info', 'warn'] as const;
      const spies = methods.map((m) =>
        vi.spyOn(console, m).mockImplementation(() => {
          // Intentional noop for test mock.
        })
      );

      try {
        const wrappedConsole = wrapper.getConsoleInstance(true);

        for (const method of methods) {
          wrappedConsole[method]('test');
        }

        for (const spy of spies) {
          expect(spy).toHaveBeenCalled();
        }
      } finally {
        for (const spy of spies) {
          spy.mockRestore();
        }
      }
    });
  });

  describe('writeSystemMessage', () => {
    it('should create a div with system-message class for string message', () => {
      wrapper.writeSystemMessage('system info');

      expect(resultEl.createDiv).toHaveBeenCalledWith({
        cls: 'system-message',
        text: 'system info'
      });
    });

    it('should create a div with system-message class for DocumentFragment', () => {
      const fragment = createFragment();
      wrapper.writeSystemMessage(fragment);

      expect(resultEl.createDiv).toHaveBeenCalledWith({
        cls: 'system-message',
        text: fragment
      });
    });

    it('should scroll the system message into view', () => {
      wrapper.writeSystemMessage('scroll test');

      expect(resultEl.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'nearest'
      });
    });
  });
});

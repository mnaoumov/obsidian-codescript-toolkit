import { errorToString } from 'obsidian-dev-utils/error';
import {
  FunctionHandlingMode,
  toJson
} from 'obsidian-dev-utils/object-utils';

type ConsoleMethod = 'debug' | 'error' | 'info' | 'log' | 'warn';

interface ConsoleWrapperConstructorParams {
  readonly resultEl: HTMLElement;
  readonly shouldAutoScrollToConsoleMessages: boolean;
}

export class ConsoleWrapper {
  private readonly resultEl: HTMLElement;
  private readonly shouldAutoScrollToConsoleMessages: boolean;

  public constructor(params: ConsoleWrapperConstructorParams) {
    this.resultEl = params.resultEl;
    this.shouldAutoScrollToConsoleMessages = params.shouldAutoScrollToConsoleMessages;
  }

  public appendToResultEl($arguments: unknown[], method: ConsoleMethod): void {
    const formattedMessage = $arguments.map((argument) => formatMessage(argument)).join(' ');
    this.appendToLog(formattedMessage, method);
  }

  public getConsoleInstance(shouldWrapConsole: boolean): Console {
    if (!shouldWrapConsole) {
      return console;
    }

    const wrappedConsole = { ...console };

    const originalConsole = console;
    for (const method of ['log', 'debug', 'error', 'info', 'warn'] as ConsoleMethod[]) {
      wrappedConsole[method] = (...$arguments: unknown[]): void => {
        originalConsole[method](...$arguments);
        this.appendToResultEl($arguments, method);
      };
    }

    return wrappedConsole;
  }

  public writeSystemMessage(message: DocumentFragment | string): void {
    const systemMessage = this.resultEl.createDiv({ cls: 'system-message', text: message });
    this.scrollIntoViewIfEnabled(systemMessage);
  }

  private appendToLog(message: string, method: ConsoleMethod): void {
    const logEntry = this.resultEl.createDiv({ cls: `console-log-entry console-log-entry-${method}`, text: message });
    this.scrollIntoViewIfEnabled(logEntry);
  }

  private scrollIntoViewIfEnabled(el: HTMLElement): void {
    if (!this.shouldAutoScrollToConsoleMessages) {
      return;
    }

    // The results panel is not its own scroll container, so this walks up to the note's scroller
    // And moves the whole page. That is wanted after a click, but not while the note is rendering.
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function formatMessage(argument: unknown): string {
  if (typeof argument === 'string') {
    return argument;
  }

  if (argument instanceof Error) {
    return errorToString(argument);
  }

  return toJson(argument, {
    functionHandlingMode: FunctionHandlingMode.NameOnly,
    maxDepth: 0,
    shouldCatchToJSONErrors: true,
    shouldHandleCircularReferences: true,
    shouldHandleErrors: true,
    shouldHandleUndefined: true,
    shouldSortKeys: true,
    tokenSubstitutions: {
      circularReference: '[[CircularReference]]',
      maxDepthLimitReached: '{...}',
      toJSONFailed: '[[ToJSONFailed]]'
    }
  });
}

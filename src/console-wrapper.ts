import { errorToString } from 'obsidian-dev-utils/error';
import {
  FunctionHandlingMode,
  toJson
} from 'obsidian-dev-utils/object-utils';

type ConsoleMethod = 'debug' | 'error' | 'info' | 'log' | 'warn';

interface ConsoleWrapperConstructorParams {
  readonly resultEl: HTMLElement;
}

export class ConsoleWrapper {
  private readonly resultEl: HTMLElement;

  public constructor(params: ConsoleWrapperConstructorParams) {
    this.resultEl = params.resultEl;
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
    systemMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  private appendToLog(message: string, method: ConsoleMethod): void {
    const logEntry = this.resultEl.createDiv({ cls: `console-log-entry console-log-entry-${method}`, text: message });
    logEntry.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

import { errorToString } from 'obsidian-dev-utils/Error';
import { noop } from 'obsidian-dev-utils/Function';
import {
  FunctionHandlingMode,
  toJson
} from 'obsidian-dev-utils/ObjectUtils';

type ConsoleMethod = 'debug' | 'error' | 'info' | 'log' | 'warn';

export class ConsoleWrapper {
  public constructor(private readonly resultEl: HTMLElement) {
    noop();
  }

  public appendToResultEl(args: unknown[], method: ConsoleMethod): void {
    const formattedMessage = args.map(formatMessage).join(' ');
    this.appendToLog(formattedMessage, method);
  }

  public getConsoleInstance(shouldWrapConsole: boolean): Console {
    if (!shouldWrapConsole) {
      return console;
    }

    const wrappedConsole = { ...console };

    for (const method of ['log', 'debug', 'error', 'info', 'warn'] as ConsoleMethod[]) {
      wrappedConsole[method] = (...args): void => {
        // eslint-disable-next-line no-console
        console[method](...args);
        this.appendToResultEl(args, method);
      };
    }

    return wrappedConsole;
  }

  public writeSystemMessage(message: string): void {
    const systemMessage = this.resultEl.createDiv({ cls: 'system-message', text: message });
    systemMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  private appendToLog(message: string, method: ConsoleMethod): void {
    const logEntry = this.resultEl.createDiv({ cls: `console-log-entry console-log-entry-${method}`, text: message });
    logEntry.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function formatMessage(arg: unknown): string {
  if (typeof arg === 'string') {
    return arg;
  }

  if (arg instanceof Error) {
    return errorToString(arg);
  }

  return toJson(arg, {
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

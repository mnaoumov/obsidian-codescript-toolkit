import {
  Command,
  Notice
} from 'obsidian';

// This script deliberately fails. It exports the removed `invokeCommand` object instead of a
// `buildInvokeCommand()` function, so the plugin reports the deprecation both when the script is
// registered (on vault load) and every time the command below is invoked. The callback never runs.
export const invokeCommand: Partial<Command> = {
  callback: (): void => {
    const message = 'This message is never shown';
    new Notice(message);
    console.log(message);
  }
};

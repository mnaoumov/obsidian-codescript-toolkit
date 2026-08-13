import {
  Command,
  Notice
} from 'obsidian';

// This script deliberately fails. It exports the removed `invokeCommand` object instead of a
// `buildInvokeCommand()` function, so the plugin reports the deprecation when the script is registered,
// and every time the command below is invoked. The callback never runs.
//
// It lives outside the invocables folder so nothing registers it when this vault loads. The buttons in
// `06 Running scripts without a button/37 Invocable scripts.md` copy it into that folder on demand and
// remove it again, so the failure is only ever shown to a reader who asked for it.
export const invokeCommand: Partial<Command> = {
  callback: (): void => {
    const message = 'This message is never shown';
    new Notice(message);
    console.log(message);
  }
};

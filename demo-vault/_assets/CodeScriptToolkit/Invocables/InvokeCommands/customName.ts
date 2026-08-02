import {
  Command,
  Notice
} from 'obsidian';

export function buildInvokeCommand(): Partial<Command> {
  return {
    callback: (): void => {
      const message = 'Command with custom name';
      new Notice(message);
      console.log(message);
    },
    name: 'Custom name'
  };
}

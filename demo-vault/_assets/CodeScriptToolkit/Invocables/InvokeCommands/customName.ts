import {
  Command,
  Notice
} from 'obsidian';

export const invokeCommand: Partial<Command> = {
  callback(): void {
    const message = 'Command with custom name';
    new Notice(message);
    console.log(message);
  },
  name: 'Custom name'
};

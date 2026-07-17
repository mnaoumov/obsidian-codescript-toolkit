import {
  Command,
  Notice
} from 'obsidian';

export const invokeCommand: Partial<Command> = {
  callback(): void {
    const message = 'Command with callback';
    new Notice(message);
    console.log(message);
  }
};

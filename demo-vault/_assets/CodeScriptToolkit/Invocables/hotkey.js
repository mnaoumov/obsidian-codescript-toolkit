import { Notice } from 'obsidian';

export function invoke() {
  const message = 'Hotkey invoke';
  new Notice(message);
  console.log(message);
}

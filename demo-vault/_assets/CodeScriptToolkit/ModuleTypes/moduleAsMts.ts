import { Notice } from 'obsidian';

export function tsAsMts() {
  const message = 'Require ts as mts';
  new Notice(message);
  console.log(message);
}

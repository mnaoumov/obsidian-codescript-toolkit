import { Notice } from 'obsidian';

export function mts() {
  const message = 'Require mts';
  new Notice(message);
  console.log(message);
}

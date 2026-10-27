import { Notice } from 'obsidian';

export function mjs() {
  const message = 'Require mjs';
  new Notice(message);
  console.log(message);
}

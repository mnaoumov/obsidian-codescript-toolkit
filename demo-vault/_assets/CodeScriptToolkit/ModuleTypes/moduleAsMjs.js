import { Notice } from 'obsidian';

export function jsAsMjs() {
  const message = 'Require js as mjs';
  new Notice(message);
  console.log(message);
}

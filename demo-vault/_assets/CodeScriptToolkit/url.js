import { Notice } from 'obsidian';

export function url() {
  const message = 'Require URL';
  new Notice(message);
  console.log(message);
}

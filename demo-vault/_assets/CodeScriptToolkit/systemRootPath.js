import { Notice } from 'obsidian';

export function systemRootPath() {
  const message = 'Require system root path';
  new Notice(message);
  console.log(message);
}

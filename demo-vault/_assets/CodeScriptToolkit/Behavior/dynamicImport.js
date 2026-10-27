import { Notice } from 'obsidian';

export function dynamicImport() {
  const message = 'Dynamic import';
  new Notice(message);
  console.log(message);
}

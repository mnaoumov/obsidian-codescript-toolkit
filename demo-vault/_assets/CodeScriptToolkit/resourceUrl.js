import { Notice } from 'obsidian';

export function resourceUrl() {
  const message = 'Require resource URL';
  new Notice(message);
  console.log(message);
}

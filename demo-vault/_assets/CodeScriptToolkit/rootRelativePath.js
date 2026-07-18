import { Notice } from 'obsidian';

export function rootRelativePath() {
  const message = 'Require root-relative path';
  new Notice(message);
  console.log(message);
}

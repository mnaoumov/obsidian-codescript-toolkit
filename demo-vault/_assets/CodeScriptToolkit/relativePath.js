import { Notice } from 'obsidian';

export function relativePath() {
  const message = 'Require relative path';
  new Notice(message);
  console.log(message);
}

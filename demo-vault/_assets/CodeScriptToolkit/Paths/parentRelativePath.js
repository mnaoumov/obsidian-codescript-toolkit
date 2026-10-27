import { Notice } from 'obsidian';

export function parentRelativePath() {
  const message = 'Require parent relative path';
  new Notice(message);
  console.log(message);
}

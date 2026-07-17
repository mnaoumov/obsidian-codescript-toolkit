import { Notice } from 'obsidian';

export function fileUrl() {
  const message = 'Require file URL';
  new Notice(message);
  console.log(message);
}

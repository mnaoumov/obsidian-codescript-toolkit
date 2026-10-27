import { Notice } from 'obsidian';

export function parentRelativePathWithCustomParentPath() {
  const message = 'Require parent relative path with custom parent path';
  new Notice(message);
  console.log(message);
}

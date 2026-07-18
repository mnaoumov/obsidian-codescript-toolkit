import { Notice } from 'obsidian';

export function invoke() {
  const message = 'Invocable MJS sync';
  new Notice(message);
  console.log(message);
}

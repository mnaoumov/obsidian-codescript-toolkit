import { Notice } from 'obsidian';

export function invoke() {
  const message = 'Invocable MTS sync';
  new Notice(message);
  console.log(message);
}

import { Notice } from 'obsidian';

export async function invoke() {
  await sleep(1000);
  const message = 'Invocable MJS async';
  new Notice(message);
  console.log(message);
}

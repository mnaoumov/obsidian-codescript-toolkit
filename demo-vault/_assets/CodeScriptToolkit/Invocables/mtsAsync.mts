import { Notice } from 'obsidian';

export async function invoke() {
  await sleep(1000);
  const message = 'Invocable MTS async';
  new Notice(message);
  console.log(message);
}

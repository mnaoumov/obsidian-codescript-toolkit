import { Notice } from 'obsidian';

export function runFromCustomJS() {
  runFrom('CustomJS');
}

export function runFromDatacorejs() {
  runFrom('datacorejs');
}

export function runFromDatacorejsx() {
  runFrom('datacorejsx');
}

export function runFromDatacorets() {
  runFrom('datacorets');
}

export function runFromDatacoretsx() {
  runFrom('datacoretsx');
}

export function runFromDataviewjs() {
  runFrom('dataviewjs');
}

export function runFromDevToolsConsole() {
  runFrom('DevTools Console');
}

export function runFromJSEngine() {
  runFrom('JS Engine');
}

export function runFromModules() {
  runFrom('Modules');
}

export function runFromQuickAdd() {
  runFrom('QuickAdd');
}

export function runFromTemplater() {
  runFrom('Templater');
}

function runFrom(from) {
  const message = `Run CodeScript Toolkit from ${from}`;
  new Notice(message);
  console.log(message);
}

class CustomJSModule {
  runFromCodeScriptToolkit() {
    const { Notice } = require('obsidian');
    const message = 'Run CustomJS from CodeScript Toolkit';
    new Notice(message);
    console.log(message);
  }
}

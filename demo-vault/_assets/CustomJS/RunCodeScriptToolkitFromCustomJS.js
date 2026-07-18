class RunCodeScriptToolkitFromCustomJS {
  invoke() {
    const { runFromCustomJS } = require('/integrateWithOtherPlugins.js');
    runFromCustomJS();
  }
}

const { Notice } = require('obsidian');

exports.invoke = async () => {
  await sleep(1000);
  const message = 'Invocable CTS async';
  new Notice(message);
  console.log(message);
};

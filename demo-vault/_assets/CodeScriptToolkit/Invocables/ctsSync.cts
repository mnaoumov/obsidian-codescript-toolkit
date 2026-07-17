const { Notice } = require('obsidian');

exports.invoke = () => {
  const message = 'Invocable CTS sync';
  new Notice(message);
  console.log(message);
};

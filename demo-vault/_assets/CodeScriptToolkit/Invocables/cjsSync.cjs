const { Notice } = require('obsidian');

exports.invoke = () => {
  const message = 'Invocable CJS sync';
  new Notice(message);
  console.log(message);
};

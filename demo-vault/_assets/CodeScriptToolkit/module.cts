const { Notice } = require('obsidian');

exports.cts = () => {
  const message = 'Require cts';
  new Notice(message);
  console.log(message);
};

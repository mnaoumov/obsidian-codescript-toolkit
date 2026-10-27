const { Notice } = require('obsidian');

exports.cjs = () => {
  const message = 'Require cjs';
  new Notice(message);
  console.log(message);
};

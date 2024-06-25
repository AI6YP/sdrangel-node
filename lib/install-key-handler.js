'use strict';

const readline = require('readline');

const loadConfig = require('./load-config.js');

const installKeyHandler = (state) => {
  readline.emitKeypressEvents(process.stdin);
  process.stdin.on('keypress', async (ch, key) => {
    // console.log('KEY : ', key);
    const cfg = state.config[key.name];
    if (cfg !== undefined) {
      await loadConfig(state, cfg.body);
      console.log('key:', key.name, 'config:', cfg.name);
    } else {
      switch(key.name) {
      case 'q':
      case 'c':
        console.log('QUIT!');
        state.sdrangel.kill();
        // process.exit();
        break;
      case 't':
        if (state.transceiverMode) {
          console.log('Transceiver OFF');
          state.transceiverMode = false;
        } else {
          console.log('Transceiver ON');
          state.transceiverMode = true;
        }
      }
    }
  });
  process.stdin.setRawMode(true);
  process.stdin.resume();
};
  
module.exports = installKeyHandler;

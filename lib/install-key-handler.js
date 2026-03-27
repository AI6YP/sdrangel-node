'use strict';

const readline = require('readline');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const loadConfig = require('./load-config.js');

let duration = 100;
let total = 0;

const step = async (msOffset) => {
  if (msOffset === 0) return;
  const now = Date.now();
  const newTime = new Date(now + msOffset);
  const isoStr = newTime.toISOString();
  
  // Linux only adjustment
  const cmd = (process.getuid && process.getuid() !== 0) 
    ? `sudo date -s "${isoStr}"`
    : `date -s "${isoStr}"`;

  try {
    await execAsync(cmd);
    total += msOffset;
    console.log(`Step clock by ${msOffset} ms, ${total} total.`);
  } catch (err) {
    console.error(`Error: Failed to set system time: ${err.message}`);
  }
};

const installKeyHandler = (state) => {
  readline.emitKeypressEvents(process.stdin);
  process.stdin.on('keypress', async (ch, key) => {
    // Tweaktime key bindings (Linux only)
    if (process.platform === 'linux') {
      switch(ch) {
        case '+':
        case '=':
          if (duration >= 50) duration += 50;
          else duration += 10;
          console.log('Current step is ' + duration + ' ms.');
          return;
        case '-':
        case '_':
          if (duration > 50) {
            duration -= 50;
            console.log('Current step is ' + duration + ' ms.');
          } else if (duration > 10) {
            duration -= 10;
            console.log('Current step is ' + duration + ' ms.');
          }
          return;
        case '<':
        case ',':
          await step(-duration);
          return;
        case '>':
        case '.':
          await step(duration);
          return;
      }
    }

    if (key && state.config[key.name] !== undefined) {
      const cfg = state.config[key.name];
      await loadConfig(state, cfg.body);
      console.log('key:', key.name, 'config:', cfg.name);
    } else if (key) {
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
        break;
      }
    }
  });
  process.stdin.setRawMode(true);
  process.stdin.resume();
};
  
module.exports = installKeyHandler;

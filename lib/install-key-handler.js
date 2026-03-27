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
  
  // Use @seconds.millis format which is very robust on Linux date -s
  const targetTime = Date.now() + msOffset;
  const timeStr = `@${(targetTime / 1000).toFixed(3)}`;
  
  const isRoot = process.getuid && process.getuid() === 0;
  const cmd = isRoot ? `date -s "${timeStr}"` : `sudo date -s "${timeStr}"`;

  try {
    await execAsync(cmd);
    total += msOffset;
    console.log(`Step clock by ${msOffset} ms, ${total} total.`);
  } catch (err) {
    console.error(`Error: Failed to set system time: ${err.message}`);
    if (err.stderr) console.error(`Stderr: ${err.stderr}`);
  }
};

const installKeyHandler = (state) => {
  if (process.stdin.isTTY) {
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
  }

  process.stdin.on('keypress', async (ch, key) => {
    // console.log('DEBUG: ch=' + ch + ' key=' + JSON.stringify(key));

    // Tweaktime key bindings (Linux only)
    if (process.platform === 'linux') {
      const char = ch || (key ? key.sequence : '');
      switch(char) {
        case '+':
        case '=':
          if (duration >= 50) duration += 50;
          else duration += 10;
          console.log(`Current step is ${duration} ms.`);
          return;
        case '-':
        case '_':
          if (duration > 50) {
            duration -= 50;
            console.log(`Current step is ${duration} ms.`);
          } else if (duration > 10) {
            duration -= 10;
            console.log(`Current step is ${duration} ms.`);
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
        if (state.sdrangel) {
            state.sdrangel.kill();
        } else {
            process.exit();
        }
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
};
  
module.exports = installKeyHandler;

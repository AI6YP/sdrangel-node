'use strict';

const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const loadConfig = require('./load-config.js');

// Path to the compiled tweaktime binary
const TWEAKTIME_BIN = path.resolve(__dirname, '../tweaktime/tweaktime');

let duration = 100;
let total = 0;

const step = async (msOffset) => {
  if (msOffset === 0) return;

  const arg = (msOffset > 0 ? '+' : '') + msOffset;
  const isRoot = process.getuid && process.getuid() === 0;

  // 1. Try tweaktime binary (Fastest method with setcap)
  try {
    // If setcap was run on this binary, it works for any user instantly.
    await execAsync(`"${TWEAKTIME_BIN}" ${arg}`);
    total += msOffset;
    console.log(`Step clock by ${msOffset} ms (Binary), ${total} total.`);
    return;
  } catch (err) {
    // If it failed and we aren't root, try with sudo as fallback
    if (!isRoot) {
      try {
        await execAsync(`sudo "${TWEAKTIME_BIN}" ${arg}`);
        total += msOffset;
        console.log(`Step clock by ${msOffset} ms (Sudo Binary), ${total} total.`);
        return;
      } catch (sudoErr) {
        // Fall through
      }
    }
  }

  // 2. Last resort: date -s (Slowest)
  const targetTime = Date.now() + msOffset;
  const timeStr = `@${(targetTime / 1000).toFixed(3)}`;
  const dateCmd = isRoot ? `date -s "${timeStr}"` : `sudo date -s "${timeStr}"`;

  try {
    await execAsync(dateCmd);
    total += msOffset;
    console.log(`Step clock by ${msOffset} ms (date), ${total} total.`);
  } catch (err) {
    console.error(`All clock adjustment methods failed: ${err.message}`);
  }
};

const installKeyHandler = (state) => {
  if (process.stdin.isTTY) {
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
  }

  process.stdin.on('keypress', async (ch, key) => {
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

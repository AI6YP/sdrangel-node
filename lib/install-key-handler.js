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

const step = async (state, msOffset) => {
  if (msOffset === 0) return;

  // Ensure state.totalTimeOffset is a number
  if (typeof state.totalTimeOffset !== 'number' || isNaN(state.totalTimeOffset)) {
    state.totalTimeOffset = 0;
  }

  const arg = (msOffset > 0 ? '+' : '') + msOffset;
  const isRoot = process.getuid && process.getuid() === 0;

  // 1. Try tweaktime binary (Fastest method with setcap)
  try {
    // If setcap was run on this binary, it works for any user instantly.
    console.log(TWEAKTIME_BIN);
    await execAsync(`"${TWEAKTIME_BIN}" ${arg}`);
    state.totalTimeOffset += msOffset;
    console.log(`Step clock by ${msOffset} ms (Binary), ${state.totalTimeOffset} total.`);
    if (state.wss) {
        broadcast(state.wss, { type: 'update', state: { totalTimeOffset: state.totalTimeOffset } });
    }
    return;
  } catch (err) {
    // If it failed and we aren't root, try with sudo as fallback
    if (!isRoot) {
      try {
        await execAsync(`sudo "${TWEAKTIME_BIN}" ${arg}`);
        state.totalTimeOffset += msOffset;
        console.log(`Step clock by ${msOffset} ms (Sudo Binary), ${state.totalTimeOffset} total.`);
        if (state.wss) {
            broadcast(state.wss, { type: 'update', state: { totalTimeOffset: state.totalTimeOffset } });
        }
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
    state.totalTimeOffset += msOffset;
    console.log(`Step clock by ${msOffset} ms (date), ${state.totalTimeOffset} total.`);
    if (state.wss) {
        broadcast(state.wss, { type: 'update', state: { totalTimeOffset: state.totalTimeOffset } });
    }
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
          if (state.wss) {
            broadcast(state.wss, { type: 'update', state: { duration } });
          }
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
          if (state.wss) {
            broadcast(state.wss, { type: 'update', state: { duration } });
          }
          return;
        case '<':
        case ',':
        case 'б':
        case 'Б':
          await step(state, -duration);
          return;
        case '>':
        case '.':
        case 'ю':
        case 'Ю':
          await step(state, duration);
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
        if (state.wss) {
            broadcast(state.wss, { type: 'update', state: { transceiverMode: state.transceiverMode } });
        }
        break;
      }
    }
  });
};

function broadcast(wss, data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(msg);
    }
  });
}

module.exports = {
  installKeyHandler,
  step
};

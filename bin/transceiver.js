#!/usr/bin/env node
'use strict';

const path = require('path');
const http = require('http');
const chp = require('child_process');
const process = require('process');

const ip = require('ip');
const express = require('express');
const bodyParser = require('body-parser');
const portfinder = require('portfinder');
const WebSocket = require('ws');
require('json5/lib/register');

const msleep = require('../lib/msleep.js');
const rpg = require('../lib/rpg.js');
const { installKeyHandler, step } = require('../lib/install-key-handler.js');
const listenMidi = require('../lib/listen-midi.js');
const transceiverHandler = require('../lib/transceiver-handler.js');
const initConfig = require('../lib/init-config.js');
const loadConfig = require('../lib/load-config.js');
const updateRitClosure = require('../lib/update-rit.js');

const { program } = require('commander');

const exiter = (code) => {
  console.log('sdrangel exited with code:', code);
  process.exit(code);
};

function broadcast(wss, data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

const main = async () => {

  program
    .option('-i, --ip <type>', 'SDRangel IP address', '127.0.0.1:8091')
    .option('-c, --config <type>', 'SDR config file')
    .option('-x, --xapoh <type>', 'XAPOH IP address')
    .option('-m, --midi', 'Enable MIDI functionality', false)
    .option('--test-ui', 'Test Web APP / Server APP interaction without launching SDRangel', false)
    .parse(process.argv);

  const opts = program.opts();

  const rp = rpg(
    http.request,
    opts.ip,
    ['', 'sdrangel'],
    console
  );

  const state = {
    rx: ['deviceset', 0],
    tx: ['deviceset', 1],
    config: {},
    opts,
    RIT: 0,
    SATR: 1, // no reverse
    transceiverMode: false,
    totalTimeOffset: 0,
    rp
  };

  state.updateRit = updateRitClosure(state);

  if (opts.config) {
    const configPath = path.resolve('.', opts.config);
    try {
      state.config = require(configPath);
      if (Array.isArray(state.config)) {
        state.config = {'0': state.config};
      }
      console.log(`Loaded config from ${opts.config} (${Object.keys(state.config).length} entries)`);
    } catch (e) {
      console.error(`Failed to load config from ${opts.config}:`, e.message);
    }
  } else if (opts.testUi) {
    console.log('--- UI TEST MODE (Mock Data) ---');
    state.config = {
      '0': { name: 'Test 144MHz', body: [] },
      '1': { name: 'Test 432MHz', body: [] },
      '2': { name: 'Test 1296MHz', body: [] }
    };
  }

  // server
  const app = express();
  app.use(bodyParser.json());
  app.use(express.static(path.join(__dirname, '../public')));

  app.patch('/sdrangel/deviceset/0/channel/0/settings', transceiverHandler(state));

  const server = http.createServer(app);
  const wss = new WebSocket.Server({ server });
  state.wss = wss;

  wss.on('connection', (ws) => {
    console.log('Web UI client connected');
    
    // Send initial state and channel info
    const channels = Object.keys(state.config).map(key => ({
      id: key,
      name: state.config[key].name || `Config ${key}`
    }));
    
    ws.send(JSON.stringify({
      type: 'init',
      channels,
      state: {
        RIT: state.RIT,
        transceiverMode: state.transceiverMode,
        totalTimeOffset: state.totalTimeOffset
      }
    }));

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        console.log('Web UI event:', data);
        
        switch (data.type) {
          case 'rit':
            await state.updateRit(data.value);
            break;
          case 'transceiver':
            state.transceiverMode = data.value;
            console.log('Transceiver', state.transceiverMode ? 'ON' : 'OFF');
            broadcast(wss, { type: 'update', state: { transceiverMode: state.transceiverMode } });
            break;
          case 'tweaktime':
            await step(state, data.value);
            break;
          case 'channel':
            console.log('Channel change requested:', data.id);
            if (!opts.testUi && state.config[data.id]) {
                await loadConfig(state, state.config[data.id].body);
            }
            break;
        }
      } catch (e) {
        console.error('WS Error:', e);
      }
    });
  });

  const port = await portfinder.getPortPromise();

  server.listen(port, async () => {
    const addr = 'http://' + ip.address() + ':' + server.address().port + '/';
    console.log('Web UI available at:', addr);
    
    if (opts.testUi) {
      console.log('Test mode: skipping SDRangel launch and MIDI init.');
      state.transceiverMode = true;
      installKeyHandler(state);
      return;
    }

    await msleep(1000);
    console.log('*********************** ANGL ***********************')
    const sdrangel = chp.spawn('sdrangel', {stdio: 'inherit'});
    sdrangel.on('close', exiter);
    sdrangel.on('exit', exiter);
    state.sdrangel = sdrangel;
    await msleep(10000);
    console.log('*********************** SPWN ***********************')
    await initConfig(state);
    await msleep(1000);
    if (opts.midi) {
        console.log('*********************** MIDI ***********************')
        await listenMidi(state);
        await msleep(1000);
    }
    console.log('*********************** TXRX ***********************')
    state.transceiverMode = true;
    installKeyHandler(state);
  });

};

main();

/* eslint camelcase: 0 */

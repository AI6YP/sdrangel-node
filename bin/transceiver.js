#!/usr/bin/env node
'use strict';

const http = require('http');
const chp = require('child_process');
const process = require('process');

const ip = require('ip');
const fs = require('fs-extra');
const express = require('express');
const bodyParser = require('body-parser');
const portfinder = require('portfinder');
const json5 = require('json5');
const merge = require('lodash.merge');
const midi = require('midi');

// const yargs = require('yargs');

const { program } = require('commander');

const rpg = require('../lib/rpg.js');

const msleep = time => new Promise(resolve => setTimeout(() => resolve(), time));

const rx = ['deviceset', 0];
const tx = ['deviceset', 1];

const exiter = (code) => {
  console.log('sdrangel exited with code:', code);
  process.exit(code);
};

const initConfig = async (rp, opts, state) => {
  // client
  const sdrangel = chp.spawn('sdrangel', {stdio: 'inherit'});

  sdrangel.on('close', exiter);
  sdrangel.on('exit', exiter);

  await msleep(10000);

  {
    const resp = await rp({method: 'GET', path: ['devicesets']}); // 200
    if (resp.devicesetcount === 0) {
      await rp({method: 'POST', path: ['deviceset?direction=0']}); // 202
      await rp({method: 'PUT',  path: [...rx, 'device'],  body: {hwType: 'PlutoSDR', direction: 0}}); // 202
    }
  }

  {
    const resp = await rp({method: 'GET', path: [...rx, 'channels', 'report']}); // 200
    if (resp.channelcount === 0) {
      await rp({method: 'POST', path: [...rx, 'channel'], body: {channelType: 'SSBDemod', direction: 0}}); // 202
    } else
    if (resp.channels[0].id !== 'SSBDemod') {
        console.error('expect RX channel 0 to be SSBDemod', resp);
    }
  }
  
  {
    const resp = await rp({method: 'GET', path: ['devicesets']}); // 200
    if (resp.devicesetcount === 1) {
      await rp({method: 'POST', path: ['deviceset?direction=1']}); // 202
      await rp({method: 'PUT',  path: [...tx, 'device'],  body: {hwType: 'PlutoSDR', direction: 1}}); // 202
    }
  }

  {
    const resp = await rp({method: 'GET', path: [...tx, 'channels', 'report']}); // 200
    if (resp.channelcount === 0) {
      await rp({method: 'POST', path: [...tx, 'channel'], body: {channelType: 'SSBMod', direction: 1}}); // 202
    } else
    if (resp.channels[0].id !== 'SSBMod') {
      console.error('expect TX channel 0 to be SSBMod', resp);
    }
  }

  if (opts.config) {

    const fbody = await fs.readFile(opts.config, 'utf8');
    const config = json5.parse(fbody);

    state.SATR = (config[0] || {}).SATR ? -1 : 1;

    let rxset = await rp({path: [...rx, 'device', 'settings']}); // 200
    merge(rxset, config[0].device);
    console.log(rxset);
    await rp({method: 'PATCH', path: [...rx, 'device', 'settings'], body: rxset}); // 200

    let demodset = await rp({path: [...rx, 'channel', 0, 'settings']}); // 200
    merge(demodset, config[0].channel);
    console.log(demodset);
    await rp({method: 'PATCH', path: [...rx, 'channel', 0, 'settings'], body: demodset}); // 200

    let txset = await rp({path: [...tx, 'device', 'settings']}); // 200
    merge(txset, config[1].device);
    console.log(txset);
    await rp({method: 'PATCH', path: [...tx, 'device', 'settings'], body: txset}); // 200

    let modset = await rp({path: [...tx, 'channel', 0, 'settings']}); // 200
    merge(modset, config[1].channel);
    console.log(modset);
    await rp({method: 'PATCH', path: [...tx, 'channel', 0, 'settings'], body: modset}); // 200
  }
  
  await rp({method: 'POST',  path: [...rx, 'device', 'run']}); // 200
  await rp({method: 'PATCH', path: [...rx, 'focus']}); // 200
  await rp({method: 'POST',  path: [...tx, 'device', 'run']});
};

const listenMidi = async (rp, state) => {
    // midi
    const input = new midi.Input();
    const inputPortCount = input.getPortCount();
    let idx;
    for (let i = 0; i < inputPortCount; i++) {
      const portName = input.getPortName(i);
      if (portName.match(/WORLDE/)) {
        idx = i;
        console.log(idx, portName);
        break;
      }
    }
    const rxset = await rp({path: [...rx, 'device', 'settings']}); // 200
    const centerFrequency = rxset.plutoSdrInputSettings.centerFrequency;
    console.log(rxset);

    let inFlight = 0;
    let newRIT;
    input.on('message', async (deltaTime, message) => {
      if (message[0] === 192) {
        newRIT = -(message[1] - 64) * 50; // -3.2...+3.1 KHz
        inFlight += 1;
        if (inFlight > 1) { // previous callback(s) is(are) still running
          return;
        }
        for (let i = 0; i < 1000; i++) { // maximum callback overlap
          const difRIT = newRIT - state.RIT;
          console.log('RIT', newRIT);
          const rx0 = await rp({path: [...rx, 'channel', 0, 'settings']});
          rx0.SSBDemodSettings.inputFrequencyOffset -= difRIT;
          await rp({method: 'PATCH', path: [...rx, 'channel', 0, 'settings'], body: rx0});
          state.RIT = newRIT;
          if (inFlight > 1) {
            inFlight = 1;
            continue;
          }
          inFlight = 0;
          console.log(i);
          break;
        }
      } else
      // if (message[0] === 176) {
      //   if (message[1] === 9) {
      //     state.RIT = (message[2] - 64) * 50; // -3.2...+3.1 KHz
      //     console.log('RIT', state.RIT);
      //     // const rx0 = await rp({path: [...rx, 'channel', 0, 'settings']});
      //     // await rp({method: 'PATCH', path: [...rx, 'channel', 0, 'settings'], body: rx0});
      //     return;
      //   }
        // } else
        // if (message[1] === 10) {
        //   console.log('SSBDemodSettings.inputFrequencyOffset');
        //   const rx0 = await rp({path: [...rx, 'channel', 0, 'settings']});
        //   rx0.SSBDemodSettings.inputFrequencyOffset = (message[1] - 64) * 50;
        //   await rp({method: 'PATCH', path: [...rx, 'channel', 0, 'settings'], body: rx0});
        // } else
        // if (message[1] === 14) {
        //   console.log('plutoSdrInputSettings.centerFrequency');
        //   merge(rxset, {
        //     plutoSdrInputSettings: {
        //       centerFrequency: centerFrequency + (message[1] - 64) * 50
        //     }
        //   });
        //   // console.log(message, rxset);
        //   await rp({method: 'PATCH', path: [...rx, 'device', 'settings'], body: rxset}); // 200
      // }
      {
        console.log(message);
      }
    });
    input.openPort(idx);
};

const main = async () => {
  // const argv = yargs
  // .option('ip',     {alias: 'i', describe: 'SDRangel IP address', default: '127.0.0.1:8091'})
  // .option('config', {alias: 'c', describe: 'SDR config file'})
  // .version()
  // .help()
  // .argv;

  const state = {
    RIT: 0,
    SATR: 1 // no reverse
  };

  program
    .option('-i, --ip <type>', 'SDRangel IP address', '127.0.0.1:8091')
    .option('-c, --config <type>', 'SDR config file')
    .parse(process.argv);

  const opts = program.opts();

  const rp = rpg(
    http.request,
    opts.ip,
    ['', 'sdrangel'],
    // console
  );

  let inFlight = 0;
  // server
  const app = express();
  app.use(bodyParser.json());
  app.patch('/sdrangel/deviceset/0/channel/0/settings', async function (req, res) {
    console.log('\u001b[32m<==\u001b[0m');

    inFlight += 1;
    if (inFlight > 1) { // previous callback(s) is(are) still running
      res.send('OK');
      return;
    }

    for (let i = 0; i < 1000; i++) { // maximum callback overlap
      const rxOffset = ((req.body || {}).SSBDemodSettings || {}).inputFrequencyOffset;
      if (rxOffset !== undefined) {
        const tx0 = await rp({path: [...tx, 'channel', 0, 'settings']});
        tx0.SSBModSettings.inputFrequencyOffset = state.SATR * rxOffset + state.RIT;
        await rp({method: 'PATCH', path: [...tx, 'channel', 0, 'settings'], body: tx0});
      }
      if (inFlight > 1) {
        inFlight = 1;
        continue;
      }
      inFlight = 0;
      console.log(i);
      res.send('OK');
      break;
    }
  });
  const server = http.createServer(app);
  const port = await portfinder.getPortPromise();
  server.listen(port, async () => {
    const addr = 'http://' + ip.address() + ':' + server.address().port + '/';
    console.log(addr);
    await msleep(1000);
    await initConfig(rp, opts, state);
    listenMidi(rp, state);
  });

};

main();

/* eslint camelcase: 0 */

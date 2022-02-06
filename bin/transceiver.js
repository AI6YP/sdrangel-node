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
// const yargs = require('yargs');

const { program } = require('commander');

const rpg = require('../lib/rpg.js');

const msleep = time => new Promise(resolve => setTimeout(() => resolve(), time));

const rx = ['deviceset', 0];
const tx = ['deviceset', 1];

const initConfig = async (rp, opts) => {
  // client
  const sdrangel = chp.spawn('sdrangel', {stdio: 'inherit'});

  const exiter = (code) => {
    console.log('sdrangel exited with code:', code);
    process.exit(code);
  };
  sdrangel.on('close', exiter);
  sdrangel.on('exit', exiter);

  await msleep(5000);

  await rp({method: 'PUT',  path: [...rx, 'device'],  body: {hwType: 'PlutoSDR', direction: 0}});
  await rp({method: 'POST', path: [...rx, 'channel'], body: {channelType: 'SSBDemod', direction: 0}});

  await rp({method: 'POST', path: ['deviceset?direction=1']});
  await rp({method: 'PUT',  path: [...tx, 'device'],  body: {hwType: 'PlutoSDR', direction: 1}});
  await rp({method: 'POST', path: [...tx, 'channel'], body: {channelType: 'SSBMod', direction: 1}});

  if (opts.config) {
    const fbody = await fs.readFile(opts.config, 'utf8');
    const config = json5.parse(fbody);

    let rxset = await rp({path: [...rx, 'device', 'settings']});
    console.log(rxset);
    Object.assign(rxset, config[0].device);
    await rp({method: 'PATCH', path: [...rx, 'device', 'settings'], body: rxset});

    let demodset = await rp({path: [...rx, 'channel', 0, 'settings']});
    console.log(demodset);
    Object.assign(demodset, config[0].channel);
    await rp({method: 'PATCH', path: [...rx, 'channel', 0, 'settings'], body: demodset});

    let txset = await rp({path: [...tx, 'device', 'settings']});
    console.log(txset);
    Object.assign(txset, config[1].device);
    await rp({method: 'PATCH', path: [...tx, 'device', 'settings'], body: txset});

    let modset = await rp({path: [...tx, 'channel', 0, 'settings']});
    console.log(modset);
    Object.assign(modset, config[1].channel);
    await rp({method: 'PATCH', path: [...tx, 'channel', 0, 'settings'], body: modset});
  }

  await rp({method: 'POST',  path: [...rx, 'device', 'run']});
  await rp({method: 'PATCH', path: [...rx, 'focus']});
  await rp({method: 'POST',  path: [...tx, 'device', 'run']});
};

const main = async () => {
  // const argv = yargs
  // .option('ip',     {alias: 'i', describe: 'SDRangel IP address', default: '127.0.0.1:8091'})
  // .option('config', {alias: 'c', describe: 'SDR config file'})
  // .version()
  // .help()
  // .argv;

  program
    .option('-i, --ip <type>', 'SDRangel IP address', '127.0.0.1:8091')
    .option('-c, --config <type>', 'SDR config file')
    .parse(process.argv);

  const opts = program.opts();

  const rp = rpg(
    http.request,
    opts.ip,
    ['', 'sdrangel'],
    console
  );


  // server
  const app = express();
  app.use(bodyParser.json());
  app.patch('/sdrangel/deviceset/0/channel/0/settings', async function (req, res) {
    res.send('OK');
    const fOffset = ((req.body || {}).SSBDemodSettings || {}).inputFrequencyOffset;
    if (fOffset !== undefined) {
      // console.log(fOffset);
      const tx0 = await rp({path: [...tx, 'channel', 0, 'settings']});
      tx0.SSBModSettings.inputFrequencyOffset = fOffset;
      await rp({method: 'PATCH', path: [...tx, 'channel', 0, 'settings'], body: tx0});
    }
  });
  const server = http.createServer(app);
  const port = await portfinder.getPortPromise();
  server.listen(port, async () => {
    const addr = 'http://' + ip.address() + ':' + server.address().port + '/';
    console.log(addr);
    await msleep(1000);
    await initConfig(rp, opts);
  });
};

main();

/* eslint camelcase: 0 */

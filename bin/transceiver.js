#!/usr/bin/env node
'use strict';

const http = require('http');
const chp = require('child_process');
const process = require('process');

const ip = require('ip');
const express = require('express');
const bodyParser = require('body-parser');
const portfinder = require('portfinder');
require('json5/lib/register');

const msleep = require('../lib/msleep.js');
const rpg = require('../lib/rpg.js');
const installKeyHandler = require('../lib/install-key-handler.js');
const listenMidi = require('../lib/listen-midi.js');
const transceiverHandler = require('../lib/transceiver-handler.js');
const initConfig = require('../lib/init-config.js');

const { program } = require('commander');

const exiter = (code) => {
  console.log('sdrangel exited with code:', code);
  process.exit(code);
};

const main = async () => {

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

  const state = {
    rx: ['deviceset', 0],
    tx: ['deviceset', 1],
    config: {},
    opts,
    RIT: 0,
    SATR: 1, // no reverse
    transceiverMode: false,
    rp
  };

  // server
  const app = express();
  app.use(bodyParser.json());

  app.patch('/sdrangel/deviceset/0/channel/0/settings', transceiverHandler(state));

  const server = http.createServer(app);
  const port = await portfinder.getPortPromise();

  server.listen(port, async () => {
    const addr = 'http://' + ip.address() + ':' + server.address().port + '/';
    console.log(addr);
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
    console.log('*********************** MIDI ***********************')
    await listenMidi(state);
    await msleep(1000);
    console.log('*********************** TXRX ***********************')
    state.transceiverMode = true;
    installKeyHandler(state);
  });

};

main();

/* eslint camelcase: 0 */

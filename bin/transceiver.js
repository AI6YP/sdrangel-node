#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs-extra');
const express = require('express');
const bodyParser = require('body-parser');
const ip = require('ip');
const portfinder = require('portfinder');
const rp = require('request-promise-native');
const json5 = require('json5');
const yargs = require('yargs');

const argv = yargs
  .option('ip', {
    describe: 'SDRangel IP address',
    default: '127.0.0.1:8091'
  })
  .option('config', {
    alias: 'c',
    describe: 'SDR config file'
  })
  .version()
  .help()
  .argv;

function angel () {
  let p = [`http://${argv.ip}/sdrangel`];
  for (let i = 0; i < arguments.length; i++) {
    p.push(arguments[i]);
  }
  return function () {
    let p1 = [];
    for (let i = 0; i < arguments.length; i++) {
      p1.push(arguments[i]);
    }
    return p.concat(p1).join('/');
  };
}

const rx = angel('deviceset', 0);
const tx = angel('deviceset', 1);

const initConfig = async () => {
  // client
  await rp({method: 'POST',  uri: rx('device', 'run'), json: true});
  await rp({method: 'POST',  uri: tx('device', 'run'), json: true});
  await rp({method: 'PATCH', uri: rx('focus'), json: true});

  if (argv.config) {
    const fbody = await fs.readFile(argv.config, 'utf8');
    const config = json5.parse(fbody);

    let rxset = await rp({uri: rx('device', 'settings'), json: true});
    Object.assign(rxset, config[0]);
    await rp({method: 'PATCH', uri: rx('device', 'settings'), json: true, body: rxset});

    let txset = await rp({uri: tx('device', 'settings'), json: true});
    Object.assign(txset, config[1]);
    await rp({method: 'PATCH', uri: tx('device', 'settings'), json: true, body: txset});
  }
};

const main = async () => {
  await initConfig();
  // server
  const app = express();
  app.use(bodyParser.json());
  app.patch('/sdrangel/deviceset/0/channel/0/settings', async function (req, res) {
    res.send('OK');
    const fOffset = ((req.body || {}).SSBDemodSettings || {}).inputFrequencyOffset;
    if (fOffset !== undefined) {
      // console.log(fOffset);
      const tx0 = await rp({uri: tx('channel', 0, 'settings'), json: true});
      tx0.SSBModSettings.inputFrequencyOffset = fOffset;
      await rp({method: 'PATCH', uri: tx('channel', 0, 'settings'), json: true, body: tx0});
    }
  });
  const server = http.createServer(app);
  const port = await portfinder.getPortPromise();
  server.listen(port, () => {
    const addr = 'http://' + ip.address() + ':' + server.address().port + '/';
    console.log(addr);
  });
};

main();

/* eslint camelcase: 0 */

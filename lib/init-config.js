'use strict';

const path = require('path');

const msleep = require('./msleep.js');
const loadConfig = require('./load-config.js');

const initConfig = async (state) => {
  const { rp, rx, tx, opts } = state;
  // client
  {
    const resp = await rp({method: 'GET', path: ['devicesets']}); // 200
    console.log(JSON.stringify(resp, null, 2));
    if (!(
      (resp.devicesetcount == 2) &&
      (resp.deviceSets[0].samplingDevice.hwType === 'PlutoSDR') &&
      (resp.deviceSets[0].samplingDevice.direction === 0) &&
      (resp.deviceSets[1].samplingDevice.hwType === 'PlutoSDR') &&
      (resp.deviceSets[1].samplingDevice.direction === 1)
    )) {
      // cleanup devices
      for (let i = 0; i < resp.devicesetcount; i++) {
        await rp({method: 'DELETE', path: ['deviceset']});
      }
      await msleep(1000);
      await rp({method: 'POST', path: ['deviceset?direction=0']}); // 202
      await msleep(1000);
      await rp({method: 'PUT',  path: [...rx, 'device'],  body: {hwType: 'PlutoSDR', direction: 0}}); // 202
      await msleep(1000);
      await rp({method: 'POST', path: ['deviceset?direction=1']}); // 202
      await msleep(1000);
      await rp({method: 'PUT',  path: [...tx, 'device'],  body: {hwType: 'PlutoSDR', direction: 1}}); // 202    
      await msleep(1000);
    }
  }
  {
    const resp = await rp({method: 'GET', path: ['devicesets']}); // 200
    console.log(JSON.stringify(resp, null, 2));
  }
  {
    const resp = await rp({method: 'GET', path: [...rx, 'channels', 'report']}); // 200
    console.log(JSON.stringify(resp, null, 2));
    if (resp.channelcount === 0) {
      await rp({method: 'POST', path: [...rx, 'channel'], body: {channelType: 'SSBDemod', direction: 0}}); // 202
    } else if (resp.channels[0].id !== 'SSBDemod') {
      console.error('expect RX channel 0 to be SSBDemod', resp);
    }
  }
  {
    const resp = await rp({method: 'GET', path: [...tx, 'channels', 'report']}); // 200
    if (resp.channelcount === 0) {
      await rp({method: 'POST', path: [...tx, 'channel'], body: {channelType: 'SSBMod', direction: 1}}); // 202
    } else if (resp.channels[0].id !== 'SSBMod') {
      console.error('expect TX channel 0 to be SSBMod', resp);
    }
  }

  if (opts.config) {
    const configPath = path.resolve('.', opts.config);
    state.config = require(configPath);
    if (Array.isArray(state.config)) {
      state.config = {'0': state.config};
    }
    // console.log(state.config);
    const key = Object.keys(state.config)[0]; // first available key
    await loadConfig(state, key);
  }
  
  await rp({method: 'POST',  path: [...rx, 'device', 'run']}); // 200
  await rp({method: 'PATCH', path: [...rx, 'focus']}); // 200
  // await rp({method: 'POST',  path: [...tx, 'device', 'run']});
};

module.exports = initConfig;

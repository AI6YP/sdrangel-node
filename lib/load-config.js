'use strict';

const merge = require('lodash.merge');

const loadConfig = async (state, config) => {
  const { rp, tx, rx } = state;
  if (!Array.isArray(config)) {
    return;
  }
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

  if (state.xapoh && config[2] && config[2].gpios) {
    state.xapoh.send(Uint8Array.from([0, 0, config[2].gpios[0], config[2].gpios[1]]));
    state.xapoh.send(Uint8Array.from([1, 0, config[2].gpios[2], config[2].gpios[3]]));
  }
};

module.exports = loadConfig;

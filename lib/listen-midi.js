'use strict';

const midi = require('midi');

const listenMidi = async (state) => {
  const { rp, rx, tx } = state;
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
    } else if (message[0] === 176 && message[1] === 67) {
      if (message[2] === 127) {
        await rp({method: 'POST',  path: [...tx, 'device', 'run']});
      } else {
        await rp({method: 'DELETE',  path: [...tx, 'device', 'run']});
      }        

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
    } else {
      console.log(message);
    }
  });
  input.openPort(idx);
};

module.exports = listenMidi;

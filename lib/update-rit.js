'use strict';

function broadcast(wss, data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(msg);
    }
  });
}

const updateRitClosure = (state) => {
  let inFlight = 0;
  let targetRIT;

  return async (newRIT) => {
    targetRIT = newRIT;
    inFlight += 1;
    if (inFlight > 1) { // previous callback(s) is(are) still running
      return;
    }
    const { rp, rx, wss, opts } = state;
    if (opts && opts.testUi) {
        state.RIT = targetRIT;
        if (wss) {
            broadcast(wss, { type: 'update', state: { RIT: state.RIT } });
        }
        inFlight = 0;
        return;
    }

    for (let i = 0; i < 1000; i++) { // maximum callback overlap
      const difRIT = targetRIT - state.RIT;
      console.log('RIT', targetRIT);
      try {
        const rx0 = await rp({path: [...rx, 'channel', 0, 'settings']});
        rx0.SSBDemodSettings.inputFrequencyOffset -= difRIT;
        await rp({method: 'PATCH', path: [...rx, 'channel', 0, 'settings'], body: rx0});
        state.RIT = targetRIT;
        if (wss) {
            broadcast(wss, { type: 'update', state: { RIT: state.RIT } });
        }
      } catch (err) {
        console.error('RIT update error:', err.message);
      }
      if (inFlight > 1) {
        inFlight = 1;
        continue;
      }
      inFlight = 0;
      break;
    }
  };
};

module.exports = updateRitClosure;

'use strict';

const updateTx = (state, cb) => {
  const { rp, tx } = state;
  if (state.rxOffset === undefined) {
    console.log('.');
    cb();
  } else {
    rp({path: [...tx, 'channel', 0, 'settings']}).then((tx0) => {
      tx0.SSBModSettings.inputFrequencyOffset = state.SATR * state.rxOffset + state.RIT;
      state.rxOffset = undefined;
      rp({method: 'PATCH', path: [...tx, 'channel', 0, 'settings'], body: tx0}).then(() => {
        console.log('*');
        cb();
      });
    });
  }
};

const transceiverHandler = (state) => {

  const update = () => {
    if (state.transceiverTimer === undefined) {
      console.log('!');
      updateTx(state, () => {
        state.transceiverTimer = setTimeout(() => {
          console.log('!!');
          updateTx(state, () => {
            state.transceiverTimer = undefined;
          });          
        }, 300);
      });  
    } else {
      console.log('?');
    }
  };

  return (req, res) => {
    res.send('OK');
    if (!state.transceiverMode) {
      console.log('\u001b[32m<== IGNORE\u001b[0m');
      return;  
    }
    const rxOffset = ((req.body || {}).SSBDemodSettings || {}).inputFrequencyOffset;
    if (rxOffset !== undefined) {
      state.rxOffset = rxOffset;
      console.log(`\u001b[32m<== ${state.rxOffset}\u001b[0m`);
      update();
    }
  };
};

module.exports = transceiverHandler;

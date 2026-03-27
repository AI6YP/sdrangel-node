#!/usr/bin/env node
'use strict';

const main = async () => {
  let done = false;
  for (let i = 2; i < 100; i++) {
    try {
      let res = await fetch('http:/192.168.100.' + i);
      if (!res.ok) {
        throw new Error('E1');
      }
      let text = await res.text();
      console.log(i);
      done = true;
    } catch (e) {
      process.stdout.write('.');
    }
    if (done) {
      break;
    }
  }
};

main();

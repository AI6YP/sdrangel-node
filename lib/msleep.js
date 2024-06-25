'use strict';

const msleep = time => new Promise(resolve => setTimeout(() => resolve(), time));

module.exports = msleep;

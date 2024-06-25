'use strict';

const rpg = (request, ip, basePath, logger) => {
  logger = logger || {log: () => {}, error: () => {}};
  const [hostname, port] = ip.split(':');
  let counter = 0;
  return (opto) => {
    const path =  basePath.concat(opto.path).join('/');
    const method = opto.method || 'GET'; // POST, PUT, PATCH
    console.log(`\u001b[34m==> ${counter++} ${method} ${path}\u001b[0m`);
    const body = opto.body || {};
    const bodyData = JSON.stringify(body);
    const headers = (method === 'GET')
      ? {
        'Content-Type': 'application/json'
      }
      : { // POST, PUT, PATCH
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyData)
      };

    return new Promise((resolve, reject) => {
      const reqOpto = {hostname, port, path, method, headers, body};
      logger.log('REQUEST:', reqOpto);
      const req = request(reqOpto, (res) => {
        const body = [];
        logger.log('STATUS:', res.statusCode);
        logger.log('HEADERS:', res.headers);
        res.setEncoding('utf8');

        if (res.statusCode >= 400) {
          resolve({});
        }
        res.on('data', (chunk) => {
          body.push(chunk);
        });
        res.on('end', () => {
          let bodo = {};
          try {
            bodo = JSON.parse(body.join(''));
          } catch (err) {
            logger.error(body);
          }
          logger.log('BODY:', bodo);
          resolve(bodo);
        });
        res.on('error', (err) => {
          logger.error(`problem with response: ${err.message}`);
          reject(err);
        });
      });
      req.on('error', (err) => {
        logger.error(`problem with request: ${err.message}`);
        reject(err);
      });

      if (method !== 'GET') { // POST, PUT, PATCH
        req.write(bodyData);
      }
      req.end();
    });
  };
};

module.exports = rpg;

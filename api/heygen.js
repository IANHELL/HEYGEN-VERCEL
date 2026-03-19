const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: ''
    };
  }

  const apiKey = event.headers['x-api-key'] || event.headers['X-Api-Key'];
  const path = event.queryStringParameters?.path || '/v2/video/generate';
  const method = event.httpMethod;

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.heygen.com',
      path: path,
      method: method,
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': event.headers['content-type'] || 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          },
          body: data
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: err.message })
      });
    });

    if (event.body) req.write(event.body);
    req.end();
  });
};

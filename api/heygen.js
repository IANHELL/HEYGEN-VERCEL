export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key, x-api-key');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = req.headers['x-api-key'];
  const path = req.query.path || '/v2/video/generate';

  const body = await new Promise((resolve) => {
    let data = [];
    req.on('data', chunk => data.push(chunk));
    req.on('end', () => resolve(Buffer.concat(data).toString()));
  });

  const https = await import('https');

  return new Promise((resolve) => {
    const url = new URL('https://api.heygen.com' + path);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: req.method,
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': req.headers['content-type'] || 'application/json'
      }
    };

    const proxyReq = https.default.request(options, (proxyRes) => {
      let data = '';
      proxyRes.on('data', chunk => data += chunk);
      proxyRes.on('end', () => {
        try {
          res.status(proxyRes.statusCode).json(JSON.parse(data));
        } catch(e) {
          res.status(proxyRes.statusCode).send(data);
        }
        resolve();
      });
    });

    proxyReq.on('error', (err) => {
      res.status(500).json({ error: err.message });
      resolve();
    });

    if (body) proxyReq.write(body);
    proxyReq.end();
  });
}

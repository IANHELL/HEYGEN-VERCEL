export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key, x-api-key, X-File-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = req.headers['x-api-key'] || req.headers['X-Api-Key'];
  const fileType = req.headers['x-file-type'] || req.headers['content-type'] || 'audio/mpeg';

  // Vercel parses body as buffer when content-type is audio
  let body;
  if (Buffer.isBuffer(req.body)) {
    body = req.body;
  } else if (typeof req.body === 'string') {
    body = Buffer.from(req.body, 'base64');
  } else {
    // fallback: read stream
    body = await new Promise((resolve) => {
      const chunks = [];
      req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      req.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  const https = await import('https');

  return new Promise((resolve) => {
    const options = {
      hostname: 'upload.heygen.com',
      path: '/v1/asset',
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': fileType,
        'Content-Length': body.length
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

    proxyReq.write(body);
    proxyReq.end();
  });
}

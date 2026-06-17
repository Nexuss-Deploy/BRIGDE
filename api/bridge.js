const https = require('https');
const crypto = require('crypto');

const TARGET_URL = process.env.TARGET_URL || 'https://nexuss-education.gt.tc/luxury_bot_bridge.php';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36';

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }));
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'object' ? JSON.stringify(body) : body);
    }
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  try {
    const initialRes = await request(TARGET_URL, {
      method: 'GET',
      headers: { 'User-Agent': USER_AGENT }
    });

    let cookie = '';
    if (typeof initialRes.data === 'string' && initialRes.data.includes('toNumbers')) {
      const matches = [...initialRes.data.matchAll(/toNumbers\("([^"]+)"\)/g)];
      if (matches.length >= 3) {
        const key = Buffer.from(matches[0][1], 'hex');
        const iv = Buffer.from(matches[1][1], 'hex');
        const ciphertext = Buffer.from(matches[2][1], 'hex');
        const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
        decipher.setAutoPadding(false);
        cookie = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('hex');
      }
    }

    if (req.method === 'GET') {
      const pollRes = await request(TARGET_URL + '?i=1&action=poll', {
        method: 'GET',
        headers: { 
          'User-Agent': USER_AGENT,
          'Cookie': cookie ? `__test=${cookie}` : ''
        }
      });
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, wake_result: pollRes.data }));
      return;
    }

    // Forward POST
    // We need to collect the body from req if not already available
    let body = req.body;
    if (req.method === 'POST' && !body) {
        body = await new Promise((resolve) => {
            let data = '';
            req.on('data', chunk => data += chunk);
            req.on('end', () => resolve(data));
        });
    }

    const forwardRes = await request(TARGET_URL + '?i=1', {
      method: 'POST',
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/json',
        'Cookie': cookie ? `__test=${cookie}` : ''
      }
    }, body);

    res.statusCode = forwardRes.status;
    res.end(forwardRes.data);

  } catch (error) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
};

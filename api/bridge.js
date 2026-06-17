const axios = require('axios');
const crypto = require('crypto');

const TARGET_URL = 'https://nexuss-education.gt.tc/luxury_bot_bridge.php';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36';

module.exports = async (req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const update = req.body;

  if (!update && req.method === 'GET') {
    return res.status(200).send('Nexuss Vercel Bridge is Active. Point your Telegram Webhook here.');
  }

  try {
    // Step 1: Initial Request to get the Challenge
    const initialRes = await axios.get(TARGET_URL, {
      headers: { 'User-Agent': USER_AGENT },
      validateStatus: () => true // Don't throw on 4xx/5xx
    });

    let html = initialRes.data;
    let cookie = '';

    // Step 2: Solve the AES Challenge
    const matches = [...html.matchAll(/toNumbers\("([^"]+)"\)/g)];
    if (matches.length >= 3) {
      const a = matches[0][1];
      const b = matches[1][1];
      const c = matches[2][1];

      const key = Buffer.from(a, 'hex');
      const iv = Buffer.from(b, 'hex');
      const ciphertext = Buffer.from(c, 'hex');

      const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
      decipher.setAutoPadding(false);
      let decrypted = decipher.update(ciphertext);
      decipher.final(); // No final data since it's zero padding

      cookie = decrypted.toString('hex');
    }

    // Step 3: Forward the Update to InfinityFree
    const forwardRes = await axios.post(TARGET_URL + '?i=1', update, {
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/json',
        'Cookie': `__test=${cookie}`
      }
    });

    console.log(`Forwarded update. Response status: ${forwardRes.status}`);
    return res.status(forwardRes.status).json(forwardRes.data);

  } catch (error) {
    console.error('Bridge Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
      detail: error.response?.data
    });
  }
};

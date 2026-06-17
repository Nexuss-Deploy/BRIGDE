const axios = require('axios');
const crypto = require('crypto');

const TARGET_URL = process.env.TARGET_URL || 'https://nexuss-education.gt.tc/luxury_bot_bridge.php';
const BRIDGE_TOKEN = process.env.BRIDGE_TOKEN; 
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36';

module.exports = async (req, res) => {
  // Optional Security Check
  if (BRIDGE_TOKEN && req.headers['x-bridge-token'] !== BRIDGE_TOKEN) {
    return res.status(403).json({ success: false, error: 'Unauthorized bridge access' });
  }

  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Wake logic: If it's a GET request, trigger a poll on the backend
  if (req.method === 'GET') {
    console.log("Wake signal received. Triggering backend poll...");
    try {
      // First, we still need to potentially solve the challenge even for a GET poll
      const initialRes = await axios.get(TARGET_URL, {
        headers: { 'User-Agent': USER_AGENT },
        validateStatus: () => true
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

      const pollRes = await axios.get(TARGET_URL + '?i=1&action=poll', {
        headers: { 
          'User-Agent': USER_AGENT,
          'Cookie': cookie ? `__test=${cookie}` : ''
        },
        validateStatus: () => true
      });

      return res.status(200).json({
        success: true,
        message: 'Nexuss Vercel Bridge is Active.',
        wake_result: pollRes.data
      });
    } catch (e) {
      return res.status(500).json({ success: false, error: 'Wake failed: ' + e.message });
    }
  }

  // Webhook logic (POST)
  try {
    const update = req.body || {};
    
    // Step 1: Initial Request to get the Challenge
    const initialRes = await axios.get(TARGET_URL, {
      headers: { 'User-Agent': USER_AGENT },
      validateStatus: () => true,
      timeout: 10000
    });

    let html = initialRes.data;
    let cookie = '';

    // Step 2: Solve the AES Challenge
    if (typeof html === 'string' && html.includes('toNumbers')) {
      const matches = [...html.matchAll(/toNumbers\("([^"]+)"\)/g)];
      if (matches.length >= 3) {
        const key = Buffer.from(matches[0][1], 'hex');
        const iv = Buffer.from(matches[1][1], 'hex');
        const ciphertext = Buffer.from(matches[2][1], 'hex');
        const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
        decipher.setAutoPadding(false);
        cookie = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('hex');
      }
    }

    // Step 3: Forward the Update
    const forwardRes = await axios.post(TARGET_URL + '?i=1', update, {
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/json',
        'Cookie': cookie ? `__test=${cookie}` : ''
      },
      validateStatus: () => true,
      timeout: 15000
    });

    return res.status(forwardRes.status).json(forwardRes.data);

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

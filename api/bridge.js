const axios = require('axios');
const crypto = require('crypto');

const TARGET_URL = 'https://nexuss-education.gt.tc/luxury_bot_bridge.php';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36';

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const update = req.body || {};
    console.log(`Incoming request: ${req.method}`);

    // Step 1: Initial Request to get the Challenge
    console.log("Fetching target to solve security challenge...");
    const initialRes = await axios.get(TARGET_URL, {
      headers: { 'User-Agent': USER_AGENT },
      validateStatus: () => true,
      timeout: 10000
    });

    let html = initialRes.data;
    let cookie = '';

    // Step 2: Solve the AES Challenge (if it exists)
    if (typeof html === 'string' && html.includes('toNumbers')) {
      console.log("Challenge detected. Solving...");
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
        let decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        cookie = decrypted.toString('hex');
        console.log("Challenge solved.");
      } else {
        console.warn("Challenge pattern found but hex strings missing.");
      }
    } else {
      console.log("No challenge detected, proceeding with direct request.");
    }

    // Step 3: Forward the Update to InfinityFree
    console.log(`Forwarding update to ${TARGET_URL}...`);
    const forwardRes = await axios.post(TARGET_URL + '?i=1', update, {
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/json',
        'Cookie': cookie ? `__test=${cookie}` : ''
      },
      validateStatus: () => true, // Capture 404s, 500s etc. instead of throwing
      timeout: 15000
    });

    console.log(`Forwarding complete. Status: ${forwardRes.status}`);
    
    // Return the server's response back to the caller (Telegram)
    return res.status(forwardRes.status).json({
      success: forwardRes.status === 200,
      bridge_status: "active",
      target_status: forwardRes.status,
      data: forwardRes.data
    });

  } catch (error) {
    console.error('Fatal Bridge Error:', error.stack || error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
      bridge_status: "crashed"
    });
  }
};

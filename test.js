const axios = require('axios');
const crypto = require('crypto');

const TARGET_URL = 'https://nexuss-education.gt.tc/luxury_bot_bridge.php';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36';

async function testBridge() {
    console.log("--- Starting Local Bridge Self-Test ---");
    console.log(`Targeting: ${TARGET_URL}`);

    try {
        // Step 1: Initial Request to get the Challenge
        console.log("\n[1/3] Fetching AES Challenge...");
        const initialRes = await axios.get(TARGET_URL, {
            headers: { 'User-Agent': USER_AGENT },
            validateStatus: () => true
        });

        const html = initialRes.data;
        let test_cookie = '';

        if (typeof html === 'string' && html.includes('toNumbers')) {
            console.log("Challenge detected. Solving...");
            
            // Step 2: Solve the AES Challenge
            const matches = [...html.matchAll(/toNumbers\("([^"]+)"\)/g)];
            if (matches.length < 3) {
                console.error("❌ Error: Response contains challenge pattern but lacks hex keys.");
                return;
            }

            const a = matches[0][1];
            const b = matches[1][1];
            const c = matches[2][1];

            const key = Buffer.from(a, 'hex');
            const iv = Buffer.from(b, 'hex');
            const ciphertext = Buffer.from(c, 'hex');

            const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
            decipher.setAutoPadding(false);
            let decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
            
            test_cookie = decrypted.toString('hex');
            console.log(`[2/3] Challenge Solved: __test=${test_cookie}`);
        } else {
            console.log("[2/3] No security challenge detected. Proceeding directly.");
        }

        // Step 3: Re-request with the solved cookie
        console.log("[3/3] Verifying bypass and file existence...");
        const finalRes = await axios.get(TARGET_URL + '?i=1&action=status', {
            headers: {
                'User-Agent': USER_AGENT,
                'Cookie': test_cookie ? `__test=${test_cookie}` : ''
            },
            validateStatus: () => true
        });

        console.log(`HTTP Response Status: ${finalRes.status}`);
        
        if (finalRes.status === 200) {
            console.log("Server Response:");
            console.log(JSON.stringify(finalRes.data, null, 2));
            if (finalRes.data && finalRes.data.status === 'online') {
                console.log("\n✅ SUCCESS: Bridge is fully operational!");
            } else {
                console.log("\n⚠️ WARNING: Connected but received unexpected data.");
            }
        } else if (finalRes.status === 404) {
            console.log("\n❌ ERROR 404: The file 'luxury_bot_bridge.php' was not found on the server.");
            console.log("👉 ACTION REQUIRED: Please ensure you have uploaded the 'luxury_bot_bridge.php' file I created to your InfinityFree htdocs folder.");
        } else {
            console.log(`\n❌ ERROR: Server returned status ${finalRes.status}`);
            console.log("Response data snippet:", typeof finalRes.data === 'string' ? finalRes.data.substring(0, 200) : "JSON/Object received");
        }

    } catch (error) {
        console.error("\n❌ FATAL TEST ERROR:", error.message);
    }
}

testBridge();

const url = 'https://your-vercel-project.com';

async function runBridgeBot() {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // This must exactly match the value in your Vercel WAF rule!
        'User-Agent': 'bridge' 
      },
      body: JSON.stringify({ data: 'Hello from bridge bot' })
    });

    const data = await response.json();
    console.log('Response from Vercel:', data);
  } catch (error) {
    console.error('Error connecting to Vercel:', error);
  }
}

runBridgeBot();


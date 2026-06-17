# Nexuss Telegram Bridge (Vercel)

This is a Node.js bridge designed to bypass the InfinityFree AES challenge for Telegram Webhooks.

## 🚀 Deployment

1.  **Install Vercel CLI** (if you haven't):
    ```bash
    npm install -g vercel
    ```

2.  **Deploy**:
    From this folder (`vercel-bridge`), run:
    ```bash
    vercel
    ```
    Follow the prompts. Once deployed, Vercel will give you a URL (e.g., `https://nexuss-bridge.vercel.app`).

3.  **Set Webhook**:
    Your webhook URL will be `https://your-vercel-domain.com/api/bridge`.
    Use this URL in @BotFather or via your `set_webhook.php` (if you update it).

## 🛠 How it works
1.  **Intercepts** the webhook from Telegram.
2.  **Hits** your InfinityFree site to get the `slowAES` challenge.
3.  **Solves** the challenge using the `crypto` module.
4.  **Forwards** the original Telegram update with the required `__test` cookie.

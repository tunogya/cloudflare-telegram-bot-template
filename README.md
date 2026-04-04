# Cloudflare Telegram Bot Template

A clean, generic starter template for building Telegram bots on **Cloudflare Workers**.

This template utilizes the best of Cloudflare's ecosystem to provide a scalable, performant, and asynchronous bot architecture.

## 🏗️ Architecture

- **Hono**: A lightweight web framework for the webhook receiver.
- **grammY**: A powerful framework for Telegram bot logic.
- **Cloudflare Queues**: Provides asynchronous processing. Requests are received by the webhook and pushed to a queue for processing. This ensures the Telegram webhook response is immediate (200 OK) and prevents timeouts.
- **Cloudflare D1**: A serverless SQL database for persistent storage (e.g., user logs).
- **Cloudflare KV**: A distributed key-value store for fast access (e.g., idempotency checks).

## 🚀 Getting Started

### 1. Prerequisites

- [Wrangler](https://developers.cloudflare.com/workers/wrangler/get-started/) installed and authenticated.
- A Telegram Bot Token from [@BotFather](https://t.me/botfather).

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
BOT_TOKEN=your_telegram_bot_token
BOT_SECRET=a_random_secret_token_for_webhooks
```

### 3. Initialize Cloudflare Resources

Create your KV, D1, and Queue resources:

```bash
# Create KV namespace
npx wrangler kv namespace create BOT_KV

# Create D1 database
npx wrangler d1 create bot-db

# Create Queue
npx wrangler queues create bot-queue
```

Update the `ids` and `queue` names in `wrangler.jsonc` with the values returned from the commands above.

### 4. Deploy

Apply migrations and deploy your worker:

```bash
# Apply migrations to D1 (local or remote)
npm run migrate:local
npm run predeploy # applies to remote

# Deploy
npm run deploy
```

### 5. Set Webhook

Tell Telegram to send updates to your Worker:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://<YOUR_WORKER_DOMAIN>/webhook&secret_token=<YOUR_BOT_SECRET>"
```

## 🛠️ Development

- `npm run dev`: Start a local development server.
- `npm run cf-typegen`: Generate TypeScript types for your Cloudflare bindings.

## 📂 Project Structure

- `src/index.ts`: The Worker entry point (Fetch/Webhook receiver + Queue consumer).
- `src/bot.ts`: Bot initialization and middleware.
- `src/handlers/`: Contains the logic for different bot commands.
- `src/services/`: Service layer for D1 database and other external integrations.
- `src/utils/`: Utility functions (e.g., idempotency checks via KV).
- `migrations/`: D1 SQL migration files.

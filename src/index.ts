/**
 * Cloudflare Worker entry point for Generic Telegram Bot Template.
 *
 * Architecture:
 *   Telegram → POST /webhook → Cloudflare Queue → Consumer → grammY Bot → D1/KV
 */

import { Hono } from "hono";
import { createBot } from "./bot";
import { isDuplicate, markProcessed } from "./utils/idempotency";
import type { AppEnv, HandlerContext } from "./env";
import type { Update } from "grammy/types";

// ─── Hono App (Webhook Receiver) ──────────────────────────────────

const app = new Hono<{ Bindings: AppEnv }>();

// Health check
app.get("/", (c) => {
  return c.json({ status: "ok", bot: "cloudflare-tg-bot-template" });
});

// Telegram webhook endpoint — STATELESS, no business logic
app.post("/webhook", async (c) => {
  // Validate secret token from Telegram
  const secretHeader = c.req.header("X-Telegram-Bot-Api-Secret-Token");
  if (secretHeader !== c.env.BOT_SECRET) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  try {
    const update: Update = await c.req.json();

    // Fire-and-forget "typing" status for immediate feedback.
    // Only send for commands or callback queries, matching the previous bot middleware behavior.
    const isCommand = !!update.message?.text?.startsWith("/");
    const isCallback = !!update.callback_query;
    const chatId = (isCommand || isCallback)
      ? (update.message?.chat.id || update.callback_query?.message?.chat.id)
      : undefined;

    if (chatId) {
      c.executionCtx.waitUntil(
        fetch(`https://api.telegram.org/bot${c.env.BOT_TOKEN}/sendChatAction`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, action: "typing" }),
        }).catch(() => {})
      );
    }

    // Push to queue for async processing
    await c.env.MY_QUEUE.send(update);

    return c.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    // Always return 200 to prevent Telegram from retrying
    return c.json({ ok: true });
  }
});

// ─── Queue Consumer ───────────────────────────────────────────────

let currentCtx: HandlerContext | null = null;

function getHandlerContext(): HandlerContext {
  if (!currentCtx) {
    throw new Error("HandlerContext not available — called outside queue consumer");
  }
  return currentCtx;
}

async function handleQueueBatch(
  batch: MessageBatch<Update>,
  env: AppEnv
): Promise<void> {
  const bot = createBot(env.BOT_TOKEN, getHandlerContext);
  await bot.init();

  for (const message of batch.messages) {
    const update = message.body;

    try {
      // Idempotency check: skip already-processed updates
      if (await isDuplicate(env.KV, update.update_id)) {
        message.ack();
        continue;
      }

      // Set the handler context for this update
      currentCtx = { db: env.DB, kv: env.KV, botToken: env.BOT_TOKEN };

      await bot.handleUpdate(update);

      // Mark as processed for idempotency
      await markProcessed(env.KV, update.update_id);

      message.ack();
    } catch (err) {
      console.error(`Error processing update ${update.update_id}:`, err);
      // Retry by not acking — message will be redelivered
      message.retry();
    } finally {
      currentCtx = null;
    }
  }
}

// ─── Export Worker ────────────────────────────────────────────────

export default {
  // Handling HTTP Request Entry (Webhook)
  fetch: app.fetch,

  // Entry point for processing Queue messages (consumer)
  async queue(
    batch: MessageBatch<Update>,
    env: AppEnv,
    _ctx: ExecutionContext
  ): Promise<void> {
    await handleQueueBatch(batch, env);
  },

  // Cron Trigger — periodic maintenance tasks
  async scheduled(
    _event: ScheduledEvent,
    env: AppEnv,
    _ctx: ExecutionContext
  ): Promise<void> {
    // Basic placeholder for periodic tasks
    console.log("Scheduled task running...");
  },
};

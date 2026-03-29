import { Bot } from "grammy";
import type { HandlerContext } from "../env";

/**
 * Registers the /hello command.
 * Demonstrates basic usage of D1 (database) and KV (storage).
 */
export function registerHelloHandler(
  bot: Bot,
  getCtx: () => HandlerContext
): void {
  bot.command("hello", async (ctx) => {
    const { db, kv } = getCtx();
    const userId = ctx.from?.id;
    const username = ctx.from?.username || "stranger";

    // 1. KV Example: Track total 'hello' counts across all users
    const globalCountKey = "stats:hello_count";
    const currentCount = parseInt((await kv.get(globalCountKey)) || "0");
    const newCount = currentCount + 1;
    await kv.put(globalCountKey, newCount.toString());

    // 2. D1 Example: Simple log of the interaction
    try {
      await db
        .prepare(
          "INSERT INTO activity_logs (user_id, action, timestamp) VALUES (?, ?, ?)"
        )
        .bind(userId, "hello", Math.floor(Date.now() / 1000))
        .run();
    } catch (err) {
      console.error("D1 log error:", err);
    }

    await ctx.reply(
      `👋 Hello, ${username}!\n\n` +
        `This bot is running on a generic Cloudflare Worker template.\n\n` +
        `📊 Global /hello count: ${newCount}\n` +
        `🗄️ Your interaction has been logged to D1.`
    );
  });
}

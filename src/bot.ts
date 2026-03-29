import { Bot } from "grammy";
import { registerHelloHandler } from "./handlers/hello";
import type { HandlerContext } from "./env";

/**
 * Creates and configures a grammY Bot instance.
 *
 * `getCtx` returns the HandlerContext (DB, KV) for the current update.
 * This is a function so the consumer can swap bindings per-update
 * while reusing the same Bot instance across a queue batch.
 */
export function createBot(
  token: string,
  getCtx: () => HandlerContext
): Bot {
  const bot = new Bot(token);

  // Global middleware (example: force reply in groups)
  bot.use(async (ctx, next) => {
    if (ctx.chat?.type !== "private" && ctx.message?.message_id) {
      const prevReply = ctx.reply.bind(ctx);
      ctx.reply = (text: string, other?: any, ...args: any[]) => {
        if (other?.reply_parameters || other?.reply_to_message_id) {
          return prevReply(text, other, ...args);
        }
        return prevReply(text, {
          reply_parameters: { message_id: ctx.message!.message_id },
          ...other,
        }, ...args);
      };
    }
    await next();
  });

  // Register command handlers
  registerHelloHandler(bot, getCtx);

  // Minimal help command
  bot.command("help", async (ctx) => {
    await ctx.reply(
      "🚀 *Generic Cloudflare Bot template*\n\n" +
      "Available commands:\n" +
      "/hello - Demo D1 & KV interaction\n" +
      "/help - Show this message",
      { parse_mode: "Markdown" }
    );
  });

  // Global error handler
  bot.catch(async (err) => {
    console.error("Bot handler error:", err.error);
    try {
      await err.ctx.reply("⚠️ Something went wrong.");
    } catch {
      // Ignore
    }
  });

  return bot;
}

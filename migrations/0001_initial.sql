-- Initial schema for Cloudflare Telegram Bot Template

-- 1. Table for activity logs (Example D1 usage)
CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);

-- 2. Index for user log queries
CREATE INDEX IF NOT EXISTS idx_user_logs ON activity_logs(user_id, timestamp DESC);

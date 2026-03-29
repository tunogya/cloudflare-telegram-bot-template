/**
 * Database service layer for the generic bot template.
 */

export interface ActivityLog {
  id: number;
  user_id: number;
  action: string;
  timestamp: number;
}

/**
 * Example function: Log a user action to D1.
 */
export async function logActivity(
  db: D1Database,
  userId: number,
  action: string
): Promise<void> {
  const ts = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      "INSERT INTO activity_logs (user_id, action, timestamp) VALUES (?, ?, ?)"
    )
    .bind(userId, action, ts)
    .run();
}

/**
 * Example function: Get latest logs for a user.
 */
export async function getLatestLogs(
  db: D1Database,
  userId: number,
  limit: number = 5
): Promise<ActivityLog[]> {
  const { results } = await db
    .prepare(
      "SELECT * FROM activity_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?"
    )
    .bind(userId, limit)
    .all<ActivityLog>();

  return results || [];
}

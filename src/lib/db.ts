import { createClient } from '@libsql/client';

// Initialize the Turso Edge Database connection
const db = createClient({
  url: process.env.TURSO_DATABASE_URL as string,
  authToken: process.env.TURSO_AUTH_TOKEN as string,
});

// Helper to get current IST time string in ISO format for SQLite
export const getISTTimestamp = () => {
  const date = new Date();
  // Calculate IST time (UTC + 5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(date.getTime() + istOffset);
  return istDate.toISOString().replace('T', ' ').substring(0, 19);
};

// Helper function to run SELECT queries
// libsql returns data in `rows` instead of a flat array, so we map it.
export const query = async (sql: string, params: any[] = []): Promise<any[]> => {
  try {
    const result = await db.execute({ sql, args: params });
    return result.rows as unknown as any[];
  } catch (err) {
    console.error('Database query error:', err);
    throw err;
  }
};

// Helper function to run INSERT/UPDATE/DELETE queries
// libsql returns `lastInsertRowid` and `rowsAffected`.
export const run = async (sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> => {
  try {
    const result = await db.execute({ sql, args: params });
    return {
      lastID: Number(result.lastInsertRowid) || 0,
      changes: result.rowsAffected,
    };
  } catch (err) {
    console.error('Database run error:', err);
    throw err;
  }
};

// Export the raw db client just in case
export default db;

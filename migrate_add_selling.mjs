import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrate() {
    try {
        await db.execute({ sql: 'ALTER TABLE TransactionItems ADD COLUMN selling_type TEXT DEFAULT NULL', args: [] });
        console.log('Added selling_type column');
    } catch (e) {
        console.log('selling_type column may already exist:', e.message);
    }
    try {
        await db.execute({ sql: 'ALTER TABLE TransactionItems ADD COLUMN selling_qty REAL DEFAULT NULL', args: [] });
        console.log('Added selling_qty column');
    } catch (e) {
        console.log('selling_qty column may already exist:', e.message);
    }
    console.log('Migration complete.');
    process.exit(0);
}

migrate();

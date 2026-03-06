import sqlite3 from 'sqlite3';
import { createClient } from '@libsql/client';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const dbPath = path.resolve(process.cwd(), 'sweetshop.db');

const localDb = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) console.error('Failed to open local DB', err);
    else console.log('Opened local SQLite DB for reading.');
});

const tursoDb = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

const runLocal = (query) => new Promise((resolve, reject) => {
    localDb.all(query, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
    });
});

async function migrate() {
    try {
        console.log('Creating tables on Turso...');
        await tursoDb.execute(`
            CREATE TABLE IF NOT EXISTS Items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                rate_per_kg REAL NOT NULL,
                created_at TEXT NOT NULL,
                stock_kg REAL DEFAULT 0,
                unit TEXT DEFAULT 'kg',
                piece_price REAL,
                piece_weight_kg REAL,
                track_stock BOOLEAN DEFAULT 1
            )
        `);

        await tursoDb.execute(`
            CREATE TABLE IF NOT EXISTS Transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                receipt_no TEXT UNIQUE NOT NULL,
                customer_name TEXT,
                customer_mobile TEXT,
                customer_gstin TEXT,
                total_amount REAL NOT NULL,
                subtotal REAL NOT NULL,
                discount_amount REAL DEFAULT 0,
                payment_mode TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        `);

        await tursoDb.execute(`
            CREATE TABLE IF NOT EXISTS TransactionItems (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transaction_id INTEGER NOT NULL,
                item_name TEXT NOT NULL,
                quantity_kg REAL NOT NULL,
                calculated_price REAL NOT NULL,
                FOREIGN KEY (transaction_id) REFERENCES Transactions(id)
            )
        `);

        await tursoDb.execute(`
             CREATE TABLE IF NOT EXISTS Expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                amount REAL NOT NULL,
                created_at TEXT NOT NULL
            )
        `);

        console.log('Tables created. Fetching local data...');

        // Items
        const items = await runLocal('SELECT * FROM Items');
        console.log(`Migrating ${items.length} Items...`);
        for (const item of items) {
            await tursoDb.execute({
                sql: `INSERT OR IGNORE INTO Items (id, name, rate_per_kg, created_at, stock_kg, unit, piece_price, piece_weight_kg, track_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [item.id, item.name, item.rate_per_kg, item.created_at, item.stock_kg, item.unit, item.piece_price, item.piece_weight_kg, item.track_stock]
            });
        }

        // Transactions
        const txs = await runLocal('SELECT * FROM Transactions');
        console.log(`Migrating ${txs.length} Transactions...`);
        for (const tx of txs) {
            await tursoDb.execute({
                sql: `INSERT OR IGNORE INTO Transactions (id, receipt_no, customer_name, customer_mobile, customer_gstin, total_amount, subtotal, discount_amount, payment_mode, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [tx.id, tx.receipt_no, tx.customer_name, tx.customer_mobile, tx.customer_gstin, tx.total_amount, tx.subtotal, tx.discount_amount, tx.payment_mode, tx.created_at]
            });
        }

        // TransactionItems
        const tItems = await runLocal('SELECT * FROM TransactionItems');
        console.log(`Migrating ${tItems.length} TransactionItems...`);
        for (const ti of tItems) {
            await tursoDb.execute({
                sql: `INSERT OR IGNORE INTO TransactionItems (id, transaction_id, item_name, quantity_kg, calculated_price) VALUES (?, ?, ?, ?, ?)`,
                args: [ti.id, ti.transaction_id, ti.item_name, ti.quantity_kg, ti.calculated_price]
            });
        }

        // Expenses
        const expenses = await runLocal('SELECT * FROM Expenses');
        console.log(`Migrating ${expenses.length} Expenses...`);
        for (const exp of expenses) {
            await tursoDb.execute({
                sql: `INSERT OR IGNORE INTO Expenses (id, name, amount, created_at) VALUES (?, ?, ?, ?)`,
                args: [exp.id, exp.name, exp.amount, exp.created_at]
            });
        }

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}

migrate();

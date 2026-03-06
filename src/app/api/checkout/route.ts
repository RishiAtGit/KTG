import { NextResponse } from 'next/server';
import db, { getISTTimestamp } from '@/lib/db';

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const body = await request.json();
        const { receipt_no, customer_name, customer_mobile, customer_gstin, total_amount, subtotal, discount_amount, payment_mode, items } = body;

        // Turso native transaction api
        const transaction = await db.transaction('write');

        try {
            const now = getISTTimestamp();

            const txResult = await transaction.execute({
                sql: `INSERT INTO Transactions (receipt_no, customer_name, customer_mobile, customer_gstin, total_amount, subtotal, discount_amount, payment_mode, created_at) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [receipt_no, customer_name || null, customer_mobile || null, customer_gstin || null, total_amount, subtotal, discount_amount, payment_mode, now]
            });

            // libsql returns lastInsertRowid as bigint, we cast it to standard number
            const transactionId = Number(txResult.lastInsertRowid);

            for (const item of items) {
                await transaction.execute({
                    sql: `INSERT INTO TransactionItems (transaction_id, item_name, quantity_kg, calculated_price) 
                          VALUES (?, ?, ?, ?)`,
                    args: [transactionId, item.name, item.quantity_kg, item.calculated_price]
                });

                await transaction.execute({
                    sql: `UPDATE Items SET stock_kg = stock_kg - ? WHERE name = ?`,
                    args: [item.quantity_kg, item.name]
                });
            }

            await transaction.commit();

            return NextResponse.json({ success: true, transactionId });

        } catch (err) {
            await transaction.rollback();
            console.error('Failed to commit Turso transaction:', err);
            return NextResponse.json({ error: 'Failed to commit transaction' }, { status: 500 });
        }

    } catch (error) {
        console.error('Error parsing request:', error);
        return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
    }
}

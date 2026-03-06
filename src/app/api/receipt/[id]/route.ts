import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const receiptId = id;
        if (!receiptId) {
            return NextResponse.json({ error: 'Receipt ID required' }, { status: 400 });
        }

        const rows = await query(`SELECT * FROM Transactions WHERE receipt_no = ?`, [receiptId]);
        const row = rows[0];

        if (!row) {
            return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
        }

        // Fetch related items from the SQLite relationship table natively
        const items = await query(`SELECT * FROM TransactionItems WHERE transaction_id = ?`, [row.id]);

        return NextResponse.json({ ...row, items }, { status: 200 });
    } catch (error) {
        console.error('Failed to fetch receipt:', error);
        return NextResponse.json({ error: 'Failed to fetch receipt' }, { status: 500 });
    }
}

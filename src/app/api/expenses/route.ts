import { NextRequest, NextResponse } from 'next/server';
import db, { getISTTimestamp, query, run } from '../../../lib/db';

// GET all expenses for a date range
export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const startDate = url.searchParams.get('startDate');
        const endDate = url.searchParams.get('endDate');

        let sql = 'SELECT * FROM Expenses ORDER BY created_at DESC';
        let params: any[] = [];

        if (startDate && endDate) {
            sql = 'SELECT * FROM Expenses WHERE DATE(created_at) >= ? AND DATE(created_at) <= ? ORDER BY created_at DESC';
            params = [startDate, endDate];
        }

        const expenses = await query(sql, params);
        return NextResponse.json(expenses);
    } catch (error) {
        console.error('Failed to fetch expenses:', error);
        return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
    }
}

// POST a new expense
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, amount } = body;

        if (!name || isNaN(amount) || amount <= 0) {
            return NextResponse.json({ error: 'Valid name and positive amount are required' }, { status: 400 });
        }

        const createdAt = getISTTimestamp();

        const result = await run(
            'INSERT INTO Expenses (name, amount, created_at) VALUES (?, ?, ?)',
            [name, amount, createdAt]
        );

        return NextResponse.json({ success: true, id: result.lastID, name, amount, created_at: createdAt });
    } catch (error) {
        console.error('Failed to create expense:', error);
        return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
    }
}

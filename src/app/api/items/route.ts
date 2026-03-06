import { NextResponse } from 'next/server';
import { query, run, getISTTimestamp } from '@/lib/db';

export async function GET() {
    try {
        const items = await query('SELECT * FROM Items ORDER BY name ASC');
        return NextResponse.json(items);
    } catch (error) {
        console.error('Failed to fetch items:', error);
        return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { name, rate_per_kg, stock_kg = 0, piece_price, piece_weight_kg, track_stock = true } = await request.json();

        if (!name || !rate_per_kg) {
            return NextResponse.json({ error: 'Name and rate are required' }, { status: 400 });
        }

        const now = getISTTimestamp();

        // Check for duplicate
        const existingItems: any[] = await query('SELECT * FROM Items WHERE LOWER(name) = LOWER(?)', [name]);

        if (existingItems && existingItems.length > 0) {
            return NextResponse.json({ error: 'Item already exists. Use the + button on the inventory list to stock up existing items.' }, { status: 400 });
        }

        const result = await run(
            'INSERT INTO Items (name, rate_per_kg, created_at, stock_kg, unit, piece_price, piece_weight_kg, track_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, rate_per_kg, now, stock_kg, 'kg', piece_price || null, piece_weight_kg || null, track_stock ? 1 : 0]
        );

        return NextResponse.json({ id: result.lastID, name, rate_per_kg, stock_kg, unit: 'kg', piece_price, piece_weight_kg, track_stock }, { status: 201 });
    } catch (error) {
        console.error('Failed to add item:', error);
        return NextResponse.json({ error: 'Failed to add item' }, { status: 500 });
    }
}

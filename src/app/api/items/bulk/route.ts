import { NextResponse } from 'next/server';
import { query, run, getISTTimestamp } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { items } = await request.json();

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Valid items array is required' }, { status: 400 });
        }

        const now = getISTTimestamp();
        let addedCount = 0;
        let mergedCount = 0;

        for (const item of items) {
            const name = item.name?.trim();
            const rate_per_kg = Number(item.rate_per_kg);
            const stock_kg = Number(item.stock_kg || 0);
            const piece_price = item.piece_price ? Number(item.piece_price) : null;
            const piece_weight_kg = item.piece_weight_kg ? Number(item.piece_weight_kg) : null;
            const track_stock = item.track_stock !== undefined ? (item.track_stock ? 1 : 0) : 1;

            if (!name || isNaN(rate_per_kg)) continue;

            // Check for duplicate
            const existingItems: any[] = await query('SELECT * FROM Items WHERE LOWER(name) = LOWER(?)', [name]);

            if (existingItems && existingItems.length > 0) {
                // Update existing stock
                const existing = existingItems[0];
                const newStock = (existing.stock_kg || 0) + stock_kg;
                await run('UPDATE Items SET rate_per_kg = ?, stock_kg = ?, piece_price = ?, piece_weight_kg = ?, track_stock = ? WHERE id = ?',
                    [rate_per_kg, newStock, piece_price, piece_weight_kg, track_stock, existing.id]);
                mergedCount++;
            } else {
                // Insert new
                await run('INSERT INTO Items (name, rate_per_kg, created_at, stock_kg, piece_price, piece_weight_kg, track_stock) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [name, rate_per_kg, now, stock_kg, piece_price, piece_weight_kg, track_stock]);
                addedCount++;
            }
        }

        return NextResponse.json({
            message: 'Bulk processing complete',
            added: addedCount,
            merged: mergedCount
        }, { status: 200 });

    } catch (error) {
        console.error('Failed to process bulk items:', error);
        return NextResponse.json({ error: 'Failed to process bulk items' }, { status: 500 });
    }
}

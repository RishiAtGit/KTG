import { NextResponse } from 'next/server';
import { run, query } from '@/lib/db';

export async function DELETE(
    request: Request,
    { params }: { params: any }
) {
    const resolvedParams = await Promise.resolve(params);
    const id = Number(resolvedParams.id);
    try {
        await run('DELETE FROM Items WHERE id = ?', [id]);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete item:', error);
        return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: any }
) {
    const resolvedParams = await Promise.resolve(params);
    const id = Number(resolvedParams.id);
    try {
        const { add_stock_kg } = await request.json();
        const addition = Number(add_stock_kg);

        if (isNaN(addition) || addition <= 0) {
            return NextResponse.json({ error: 'Valid stock quantity required' }, { status: 400 });
        }

        // Fetch current to calculate new total securely
        const currentRes: any[] = await query('SELECT stock_kg FROM Items WHERE id = ?', [id]);
        if (currentRes.length === 0) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

        const currentStock = Number(currentRes[0].stock_kg || 0);
        const newStock = currentStock + addition;

        await run('UPDATE Items SET stock_kg = ? WHERE id = ?', [newStock, id]);
        return NextResponse.json({ success: true, stock_kg: newStock });
    } catch (error) {
        console.error('Failed to update stock:', error);
        return NextResponse.json({ error: 'Failed to update stock' }, { status: 500 });
    }
}

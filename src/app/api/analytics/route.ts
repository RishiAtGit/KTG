import { NextResponse } from 'next/server';
import { query, getISTTimestamp } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    let dateFilter = '';
    let params: (string | number)[] = [];

    if (startDate && endDate) {
      dateFilter = 'WHERE substr(created_at, 1, 10) >= ? AND substr(created_at, 1, 10) <= ?';
      params.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = 'WHERE substr(created_at, 1, 10) = ?';
      params.push(startDate);
    } else {
      // default to today in IST
      const todayIST = getISTTimestamp().substring(0, 10);
      dateFilter = 'WHERE substr(created_at, 1, 10) = ?';
      params.push(todayIST);
    }

    // 1. Get Top Sellers
    const topSellersQuery = `
      SELECT item_name, sum(quantity_kg) as total_qty, sum(calculated_price) as total_revenue
      FROM TransactionItems
      JOIN Transactions ON TransactionItems.transaction_id = Transactions.id
      ${dateFilter}
      GROUP BY item_name
      ORDER BY total_qty DESC
    `;
    const topSellers = await query(topSellersQuery, params);

    // 2. Get Sales per hour (for chart)
    const salesPerHourQuery = `
      SELECT strftime('%H:00', created_at) as hour, sum(total_amount) as amount
      FROM Transactions
      ${dateFilter}
      GROUP BY hour
      ORDER BY hour
    `;
    const hourlySales = await query(salesPerHourQuery, params);

    // 3. Get Logs
    const logsQuery = `
      SELECT Transactions.*, 
             json_group_array(json_object('name', TransactionItems.item_name, 'quantity_kg', TransactionItems.quantity_kg, 'calculated_price', TransactionItems.calculated_price, 'selling_type', TransactionItems.selling_type, 'selling_qty', TransactionItems.selling_qty)) as items
      FROM Transactions
      LEFT JOIN TransactionItems ON Transactions.id = TransactionItems.transaction_id
      ${dateFilter}
      GROUP BY Transactions.id
      ORDER BY Transactions.created_at DESC
    `;
    const logs = await query(logsQuery, params);

    // 4. Get Monthly Sales Total
    const monthFilter = startDate ? startDate.substring(0, 7) : getISTTimestamp().substring(0, 7);
    const monthlySalesQuery = `
          SELECT sum(total_amount) as total
          FROM Transactions
          WHERE substr(created_at, 1, 7) = ?
        `;
    const monthlySalesRes: any = await query(monthlySalesQuery, [monthFilter]);
    const monthlySales = monthlySalesRes[0]?.total || 0;

    // 5. Get Top 10 Monthly Sellers
    const topMonthlySellersQuery = `
          SELECT item_name, sum(quantity_kg) as total_qty, sum(calculated_price) as total_revenue
          FROM TransactionItems
          JOIN Transactions ON TransactionItems.transaction_id = Transactions.id
          WHERE substr(Transactions.created_at, 1, 7) = ?
          GROUP BY item_name
          ORDER BY total_qty DESC
          LIMIT 10
        `;
    const topMonthlySellers = await query(topMonthlySellersQuery, [monthFilter]);

    // 6. Get Inventory Stats
    let invParams: (string | number)[] = [];
    let dateCondition = '1=1';
    if (startDate && endDate) {
      dateCondition = 'substr(Transactions.created_at, 1, 10) >= ? AND substr(Transactions.created_at, 1, 10) <= ?';
      invParams.push(startDate, endDate);
    } else if (startDate || !startDate) {
      const targetDate = startDate || getISTTimestamp().substring(0, 10);
      dateCondition = 'substr(Transactions.created_at, 1, 10) = ?';
      invParams.push(targetDate);
    }

    const inventoryStatsQuery = `
      SELECT 
        Items.id,
        Items.name,
        Items.stock_kg as current_stock,
        Items.unit,
        Items.piece_price,
        COALESCE(SUM(CASE WHEN ${dateCondition} THEN TransactionItems.quantity_kg ELSE 0 END), 0) as total_sold
      FROM Items
      LEFT JOIN TransactionItems ON Items.name = TransactionItems.item_name
      LEFT JOIN Transactions ON TransactionItems.transaction_id = Transactions.id
      GROUP BY Items.id
      ORDER BY Items.name ASC
    `;
    const inventoryStats = await query(inventoryStatsQuery, invParams);

    return NextResponse.json({
      topSellers,
      hourlySales,
      logs,
      monthlySales,
      topMonthlySellers,
      inventoryStats
    });

  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}

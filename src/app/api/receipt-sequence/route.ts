import { NextResponse } from 'next/server';
import { query, getISTTimestamp } from '@/lib/db';

export async function GET(): Promise<NextResponse> {
    try {
        const istDateStr = getISTTimestamp(); // e.g. "2026-03-05 13:45:00"

        // Determine Financial Year
        const year = parseInt(istDateStr.substring(0, 4), 10);
        const month = parseInt(istDateStr.substring(5, 7), 10);

        // FY starts in April (month 4). If Jan-Mar, FY is (year-1)-(year).
        let fyStartYear, fyEndYear;
        if (month >= 4) {
            fyStartYear = year;
            fyEndYear = year + 1;
        } else {
            fyStartYear = year - 1;
            fyEndYear = year;
        }

        const fyStr = `${fyStartYear}-${fyEndYear.toString().slice(-2)}`;
        const prefix = `KTG/${fyStr}/`;

        const rows = await query(`SELECT receipt_no FROM Transactions WHERE receipt_no LIKE ? ORDER BY id DESC LIMIT 1`, [`${prefix}%`]);

        let nextNum = 1;
        if (rows && rows.length > 0 && rows[0].receipt_no) {
            // Extract number after the prefix
            const currentNumStr = (rows[0].receipt_no as string).replace(prefix, '');
            const currentNum = parseInt(currentNumStr, 10);
            if (!isNaN(currentNum)) {
                nextNum = currentNum + 1;
            }
        }

        const receipt_no = `${prefix}${nextNum}`;
        return NextResponse.json({ receipt_no });

    } catch (err) {
        console.error('Sequence API error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

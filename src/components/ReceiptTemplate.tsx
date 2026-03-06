import React from 'react';

interface ReceiptProps {
    type: 'BILL' | 'KOT';
    payload: any;
}

export default function ReceiptTemplate({ type, payload }: ReceiptProps) {
    if (!payload || !payload.items) return null;

    // Formatting Date & Time similar to image
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB').replace(/\//g, '-'); // DD-MM-YYYY
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false }); // HH:MM:SS

    // Calculate backward tax (Total includes 5% GST -> 2.5% CGST and 2.5% SGST)
    const GST_RATE = 0.05; // 5% total
    const HALF_GST = GST_RATE / 2; // 2.5%

    // We compute the backwards Sub Total for the footer
    const netAmount = payload.total_amount;
    const subTotal = netAmount / (1 + GST_RATE);

    return (
        <div className="receipt-container bg-white text-black font-mono text-sm leading-tight max-w-[80mm] mx-auto p-4 border border-gray-200">

            {/* Header */}
            <div className="text-center mb-3">
                <h1 id="shop-title" className="text-xl mb-1 cursor-pointer" style={{ fontSize: '1.2rem', fontWeight: 500 }}>KTG Family Restaurant</h1>
                <p className="text-[11px] leading-snug">
                    LGF 16, Ajnara Plazio, Sector 16B, Gr Noida
                </p>
                <p className="text-[11px] mt-0.5">Mobile: 9560309732</p>
                <p className="text-[12px] mt-1">GSTIN : 09AAJCK3937A1ZL</p>
                {type === 'BILL' && <p className="text-[12px] mt-1 font-bold">Tax Invoice</p>}
            </div>

            {type === 'KOT' && (
                <div className="text-center font-bold text-lg mb-2 border-y border-dashed border-black py-1">
                    KITCHEN ORDER TICKET
                </div>
            )}

            {/* Meta */}
            <div className="flex justify-between text-xs mb-1">
                <span>BILL NO: {payload.receipt_no}</span>
                <span>TIME: {timeStr}</span>
            </div>
            <div className="flex justify-between text-xs mb-2">
                <span>TABLE NO: -</span>
                <span>DATE: {dateStr}</span>
            </div>

            <div className="text-xs mb-3 flex flex-col gap-0.5">
                <div className="flex gap-2 flex-wrap">
                    <span>Name: {payload.customer_name || 'Customer'}</span>
                    {payload.customer_gstin && (
                        <span className="font-semibold">| GSTIN: {payload.customer_gstin}</span>
                    )}
                </div>
                {payload.customer_mobile && <div>Mobile: {payload.customer_mobile}</div>}
            </div>

            {/* Grid Header */}
            <div className="border-b border-t border-dashed border-black py-1 mb-2 text-[10px] sm:text-[11px] font-bold">
                {type === 'BILL' ? (
                    <div className="grid grid-cols-[3fr_1.5fr_1.5fr_1fr_1fr_1.5fr] gap-1">
                        <div>Particulars</div>
                        <div className="text-center">Qty</div>
                        <div className="text-right">Price</div>
                        <div className="text-right">CGST</div>
                        <div className="text-right">SGST</div>
                        <div className="text-right">Amount</div>
                    </div>
                ) : (
                    <div className="grid grid-cols-[2fr_1fr] gap-2">
                        <div>Particulars</div>
                        <div className="text-right">Qty</div>
                    </div>
                )}
            </div>

            {/* Grid Body */}
            <div className="text-[10px] sm:text-[11px] mb-2 flex flex-col gap-1.5">
                {payload.items.map((item: any, idx: number) => {
                    let qtyStr = '';
                    // Use stored selling_type & selling_qty if available (ensures piece billing looks right on reprint)
                    if (item.selling_type === 'pc' && item.selling_qty != null) {
                        qtyStr = `${item.selling_qty} pc`;
                    } else if (item.selling_type === 'kg' && item.selling_qty != null) {
                        qtyStr = item.selling_qty >= 1000 ? `${(item.selling_qty / 1000).toFixed(2)} kg` : `${item.selling_qty} g`;
                    } else {
                        // Fallback for older records stored only with quantity_kg
                        qtyStr = item.quantity_kg >= 1 ? `${item.quantity_kg.toFixed(2)} kg` : `${(item.quantity_kg * 1000).toFixed(0)} g`;
                    }

                    const amount = item.calculated_price;
                    const basePrice = amount / (1 + GST_RATE);
                    const cgst = basePrice * HALF_GST;
                    const sgst = basePrice * HALF_GST;

                    return type === 'BILL' ? (
                        <div key={idx} className="grid grid-cols-[3fr_1.5fr_1.5fr_1fr_1fr_1.5fr] gap-1 items-start">
                            <div className="break-words leading-tight pr-1">{item.name}</div>
                            <div className="text-center whitespace-nowrap">{qtyStr}</div>
                            <div className="text-right">{basePrice.toFixed(2)}</div>
                            <div className="text-right">{cgst.toFixed(2)}</div>
                            <div className="text-right">{sgst.toFixed(2)}</div>
                            <div className="text-right font-medium">{amount.toFixed(2)}</div>
                        </div>
                    ) : (
                        <div key={idx} className="grid grid-cols-[2fr_1fr] gap-2 items-start border-b border-gray-100 pb-1 last:border-0 last:pb-0">
                            <div className="break-words font-medium">{item.name}</div>
                            <div className="text-right font-bold whitespace-nowrap">{qtyStr}</div>
                        </div>
                    );
                })}
            </div>

            {/* Totals (Only for Bill) */}
            {type === 'BILL' && (
                <>
                    <div className="border-t border-dashed border-black pt-1 mb-2">
                        <table className="w-full text-[12px]">
                            <tbody>
                                <tr>
                                    <td className="text-right w-3/4 pr-4">Sub Total</td>
                                    <td className="text-right font-bold w-1/4 pr-1">{(payload.subtotal || netAmount).toFixed(2)}</td>
                                </tr>
                                {payload.discount_amount > 0 && (
                                    <tr>
                                        <td className="text-right pr-4">Discount</td>
                                        <td className="text-right pr-1">- {payload.discount_amount.toFixed(2)}</td>
                                    </tr>
                                )}
                                <tr className="border-t border-dashed border-black">
                                    <td className="text-right pr-4 pt-1 font-bold">Net Amount</td>
                                    <td className="text-right pt-1 font-bold pr-1">{netAmount.toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Footer */}
            <div className="text-center mt-2 pb-2 text-[12px]">
                {type === 'BILL' ? 'Thank You ! Please visit again !' : '*** END OF KOT ***'}
            </div>
        </div>
    );
}

"use client";
import { use, useEffect, useState } from "react";
import ReceiptTemplate from "@/components/ReceiptTemplate";
import Link from "next/link";

export default function ReceiptViewer({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    const [loading, setLoading] = useState(true);
    const [receiptData, setReceiptData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        const fetchReceipt = async () => {
            try {
                const res = await fetch(`/api/receipt/${encodeURIComponent(id)}`);
                if (!res.ok) {
                    setError(res.status === 404 ? "Receipt not found. It may have been deleted." : "Failed to load receipt details.");
                    return;
                }
                const data = await res.json();
                setReceiptData(data);
            } catch (err) {
                console.error(err);
                setError("An error occurred while fetching the receipt.");
            } finally {
                setLoading(false);
            }
        };

        fetchReceipt();
    }, [id]);

    const handleWhatsApp = () => {
        const publicLink = window.location.href;
        const phone = receiptData?.customer_mobile || '';
        const msg = `Your bill from KTG Family Restaurant:\n${publicLink}`;
        if (phone) {
            window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, '_blank');
        } else {
            window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans p-6">
                <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center max-w-sm w-full">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 font-medium">Loading your bill...</p>
                </div>
            </div>
        );
    }

    if (error || !receiptData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans p-6">
                <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center max-w-sm w-full text-center">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Unavailable</h2>
                    <p className="text-gray-500 text-sm">{error || "Could not find receipt"}</p>
                    <Link href="/" className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors">← Back to POS</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 font-sans">
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden pt-4 pb-2 w-full max-w-md print:shadow-none print:w-full">
                {/* Action Bar */}
                <div className="px-4 pb-3 border-b border-gray-100 flex justify-between items-center no-print bg-white sticky top-0 z-10 gap-2">
                    <Link
                        href="/"
                        className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to POS
                    </Link>
                    <div className="flex gap-2">
                        <button
                            onClick={handleWhatsApp}
                            className="flex items-center gap-1.5 px-3 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors text-sm"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                            WhatsApp
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-100 transition-colors text-sm"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            Print
                        </button>
                    </div>
                </div>
                <div className="flex justify-center p-6 bg-white overflow-y-auto">
                    <ReceiptTemplate type="BILL" payload={receiptData} />
                </div>
                <div className="pb-4 pt-2 text-center text-xs text-gray-400 no-print">
                    Powered by KTG Billing
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    body { background: white !important; padding: 0 !important; }
                    .no-print { display: none !important; }
                }
            `}} />
        </div>
    );
}

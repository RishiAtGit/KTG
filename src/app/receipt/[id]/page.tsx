"use client";
import { use, useEffect, useState } from "react";
import ReceiptTemplate from "@/components/ReceiptTemplate";

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
                    if (res.status === 404) {
                        setError("Receipt not found. It may have been deleted.");
                    } else {
                        setError("Failed to load receipt details.");
                    }
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
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 font-sans">
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden pt-4 pb-2 w-full max-w-md print:shadow-none print:w-full">
                <div className="px-6 pb-4 border-b border-gray-100 flex justify-between items-center no-print bg-white sticky top-0 z-10">
                    <h1 className="font-bold text-gray-800">Your Bill Details</h1>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        Print
                    </button>
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

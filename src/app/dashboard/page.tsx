"use client";
import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Calendar, ArrowLeft, TrendingUp, IndianRupee, Package, ArrowRight, Activity, Search } from 'lucide-react';
import Link from 'next/link';
import ReceiptTemplate from '@/components/ReceiptTemplate';

export default function Dashboard() {
    const getISTDateString = () => {
        const date = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istDate = new Date(date.getTime() + istOffset);
        return istDate.toISOString().split('T')[0];
    };

    const [startDate, setStartDate] = useState(getISTDateString());
    const [endDate, setEndDate] = useState(getISTDateString());
    const [searchQuery, setSearchQuery] = useState('');
    const [data, setData] = useState({ topSellers: [], hourlySales: [], logs: [] });
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState<any>(null);

    useEffect(() => {
        fetchData();
    }, [startDate, endDate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/analytics?startDate=${startDate}&endDate=${endDate}`);
            const json = await res.json();
            setData(json);
        } catch (error) {
            console.error('Failed to fetch analytics', error);
        }
        setLoading(false);
    };

    const filteredLogs = data.logs.filter((log: any) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            log.receipt_no.toLowerCase().includes(q) ||
            (log.customer_name?.toLowerCase().includes(q) ?? false) ||
            (log.customer_mobile?.includes(q) ?? false)
        );
    });

    const totalRevenue = filteredLogs.reduce((sum: number, tx: any) => sum + tx.total_amount, 0);
    const totalOrders = filteredLogs.length;
    const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0;

    const exportToCSV = () => {
        if (filteredLogs.length === 0) return;

        // Headers
        const headers = ['Time', 'Receipt No', 'Customer Name', 'Mobile', 'Payment Mode', 'Amount'];

        // Rows
        const rows = filteredLogs.map((log: any) => [
            new Date(log.created_at).toLocaleString('en-IN'),
            log.receipt_no,
            log.customer_name || 'Walk-in',
            log.customer_mobile || '',
            log.payment_mode,
            log.total_amount
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map((r: any[]) => r.map((c: any) => `"${c}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Sales_Report_${startDate}_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                                <ArrowLeft size={20} />
                            </button>
                        </Link>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Activity className="text-indigo-600" size={24} /> Analytics Dashboard
                        </h1>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="flex items-center bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 gap-2">
                            <Calendar size={16} className="text-gray-500" />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm font-semibold text-gray-800"
                            />
                            <span className="text-gray-400 text-sm font-medium">to</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm font-semibold text-gray-800"
                            />
                        </div>
                        <button
                            onClick={fetchData}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            Apply Filter
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Total Revenue</p>
                            <h3 className="text-3xl font-black text-gray-900">₹{totalRevenue.toLocaleString('en-IN')}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <IndianRupee size={24} />
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Total Orders</p>
                            <h3 className="text-3xl font-black text-gray-900">{totalOrders}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                            <Package size={24} />
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Avg Order Value</p>
                            <h3 className="text-3xl font-black text-gray-900">₹{avgOrderValue}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

                    {/* Sales Chart */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-6">Hourly Sales Trend</h2>
                        <div className="h-[300px] w-full">
                            {loading ? (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">Loading chart...</div>
                            ) : data.hourlySales.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.hourlySales} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value: any) => [`₹${value}`, 'Revenue']}
                                        />
                                        <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">No data for selected date</div>
                            )}
                        </div>
                    </div>

                    {/* Top Sellers */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col h-[380px]">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 shrink-0">Top Selling Items</h2>
                        <div className="flex-1 overflow-y-auto pr-2">
                            {loading ? (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">Loading top items...</div>
                            ) : data.topSellers.length > 0 ? (
                                <div className="space-y-4">
                                    {data.topSellers.map((item: any, idx) => (
                                        <div key={idx} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center shrink-0">
                                                    #{idx + 1}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-800 line-clamp-1">{item.item_name}</p>
                                                    <p className="text-xs text-gray-500">{item.total_qty.toFixed(2)} kg sold</p>
                                                </div>
                                            </div>
                                            <div className="font-bold text-gray-800">
                                                ₹{item.total_revenue.toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">No data for selected date range</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Transaction Logs */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-12">
                    <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            Transaction Logs <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{filteredLogs.length}</span>
                        </h2>

                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search Name, Phone, Bill No..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-gray-900"
                                />
                            </div>
                            <button
                                onClick={exportToCSV}
                                disabled={filteredLogs.length === 0}
                                className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-green-200/50"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                Export CSV
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 uppercase font-semibold text-xs py-3 border-b border-gray-200 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4">Time</th>
                                    <th className="px-6 py-4">Receipt No.</th>
                                    <th className="px-6 py-4">Customer</th>
                                    <th className="px-6 py-4 text-center">Payment Mode</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                    <th className="px-6 py-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan={5} className="text-center py-8 text-gray-400">Loading logs...</td></tr>
                                ) : filteredLogs.length > 0 ? (
                                    filteredLogs.map((log: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                                                {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-indigo-600">
                                                {log.receipt_no}
                                            </td>
                                            <td className="px-6 py-4">
                                                {log.customer_name ? (
                                                    <span className="font-semibold text-gray-800">{log.customer_name}</span>
                                                ) : (
                                                    <span className="text-gray-400 italic">Walk-in Customer</span>
                                                )}
                                                {log.customer_mobile && <div className="text-xs text-gray-500 mt-0.5">{log.customer_mobile}</div>}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${log.payment_mode === 'Online' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                                    {log.payment_mode}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-900">
                                                ₹{log.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 pl-2 text-center">
                                                <button
                                                    onClick={() => setSelectedLog(log)}
                                                    className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1 rounded-md text-xs font-semibold transition-colors border border-indigo-100"
                                                >
                                                    View/Print
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={5} className="text-center py-8 text-gray-400">No transactions recorded for this date.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* Reprint Modal */}
            {selectedLog && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-lg w-full flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="font-bold text-gray-800">Reprint Bill</h2>
                            <button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-gray-600 font-bold p-1">✕</button>
                        </div>
                        <div className="p-6 overflow-y-auto bg-gray-50 flex-1 flex justify-center" id="reprint-receipt-section">
                            <ReceiptTemplate
                                type="BILL"
                                payload={{
                                    ...selectedLog,
                                    items: typeof selectedLog.items === 'string' ? JSON.parse(selectedLog.items || '[]') : (selectedLog.items || [])
                                }}
                            />
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-3">
                            <button onClick={() => setSelectedLog(null)} className="px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    const printContent = document.getElementById('reprint-receipt-section')!.innerHTML;
                                    const windowUrl = 'about:blank';
                                    const uniqueName = new Date();
                                    const windowName = 'Print' + uniqueName.getTime();
                                    const printWindow = window.open(windowUrl, windowName, 'width=400,height=600');

                                    if (printWindow) {
                                        printWindow.document.write(`
                                            <html>
                                            <head><title>Print Receipt</title></head>
                                            <style>
                                                @page { margin: 0; }
                                                body { margin: 0; padding: 10px; font-family: monospace; }
                                                table { width: 100%; border-collapse: collapse; }
                                                th, td { padding: 4px; text-align: left; }
                                                .text-right { text-align: right; }
                                                .text-center { text-align: center; }
                                            </style>
                                            <body>${printContent}</body>
                                            </html>
                                        `);
                                        printWindow.document.close();
                                        setTimeout(() => {
                                            printWindow.print();
                                            printWindow.close();
                                        }, 250);
                                    }
                                }}
                                className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
                            >
                                Print Again
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

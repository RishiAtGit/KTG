"use client";
import { useState, useEffect } from 'react';
import { Trash2, Plus, Loader2, ArrowLeft, TrendingUp, IndianRupee, Package, Calendar, Activity, Upload, Search, Download } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import ReceiptTemplate from '@/components/ReceiptTemplate';

interface Item {
    id: number;
    name: string;
    rate_per_kg: number;
    stock_kg?: number;
    unit?: string;
    piece_price?: number;
    piece_weight_kg?: number;
    track_stock?: boolean;
}

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [items, setItems] = useState<Item[]>([]);
    const [name, setName] = useState('');
    const [rate, setRate] = useState('');
    const [stock, setStock] = useState('');
    const [piecePrice, setPiecePrice] = useState('');
    const [pieceWeight, setPieceWeight] = useState('');
    const [trackStock, setTrackStock] = useState(true);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Analytics State
    const getISTDateString = () => {
        const date = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istDate = new Date(date.getTime() + istOffset);
        return istDate.toISOString().split('T')[0];
    };

    const [startDate, setStartDate] = useState(getISTDateString());
    const [endDate, setEndDate] = useState(getISTDateString());
    const [data, setData] = useState({ topSellers: [], hourlySales: [], logs: [], monthlySales: 0, topMonthlySellers: [], inventoryStats: [] });
    const [loadingAnalytics, setLoadingAnalytics] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [uploadingBulk, setUploadingBulk] = useState(false);

    // Expenses State
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loadingExpenses, setLoadingExpenses] = useState(true);
    const [expenseName, setExpenseName] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [submittingExpense, setSubmittingExpense] = useState(false);

    // Logs State
    const [logSearch, setLogSearch] = useState('');
    const [selectedLog, setSelectedLog] = useState<any>(null);

    useEffect(() => {
        if (isAuthenticated) {
            fetchItems();
            fetchAnalytics();
            fetchExpenses();
        }
    }, [isAuthenticated, startDate, endDate]);

    const fetchExpenses = async () => {
        setLoadingExpenses(true);
        try {
            const res = await fetch(`/api/expenses?startDate=${startDate}&endDate=${endDate}`);
            const json = await res.json();
            setExpenses(json);
        } catch (error) {
            console.error('Failed to fetch expenses', error);
        }
        setLoadingExpenses(false);
    };

    const fetchAnalytics = async () => {
        setLoadingAnalytics(true);
        try {
            const res = await fetch(`/api/analytics?startDate=${startDate}&endDate=${endDate}`);
            const json = await res.json();
            setData(json);
        } catch (error) {
            console.error('Failed to fetch analytics', error);
        }
        setLoadingAnalytics(false);
    };

    const handleLogin = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (password === 'ktgajnara9560') {
            setIsAuthenticated(true);
        } else {
            alert('Incorrect password');
        }
    };

    const fetchItems = async () => {
        try {
            const res = await fetch('/api/items');
            const data = await res.json();
            setItems(data);
        } catch (error) {
            console.error('Failed to fetch items:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !rate) return;

        setSubmitting(true);
        try {
            const res = await fetch('/api/items', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    rate_per_kg: parseFloat(rate),
                    stock_kg: parseFloat(stock) || 0,
                    piece_price: parseFloat(piecePrice) || null,
                    piece_weight_kg: pieceWeight ? parseFloat(pieceWeight) / 1000 : null,
                    track_stock: trackStock
                }),
            });

            if (res.ok) {
                setName('');
                setRate('');
                setStock('');
                setPiecePrice('');
                setPieceWeight('');
                setTrackStock(true);
                fetchItems();
            } else {
                const errorData = await res.json();
                alert(`Failed to add item: ${errorData.error}`);
            }
        } catch (error) {
            console.error('Failed to add item:', error);
            alert('An unexpected error occurred while adding the item.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleExpenseSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!expenseName || !expenseAmount) return;

        setSubmittingExpense(true);
        try {
            const res = await fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: expenseName, amount: parseFloat(expenseAmount) }),
            });
            if (res.ok) {
                setExpenseName('');
                setExpenseAmount('');
                fetchExpenses();
            } else {
                const errorData = await res.json();
                alert(`Failed to add expense: ${errorData.error}`);
            }
        } catch (error) {
            console.error('Failed to add expense:', error);
            alert('An unexpected error occurred while adding the expense.');
        } finally {
            setSubmittingExpense(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this item?')) return;

        try {
            const res = await fetch(`/api/items/${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                fetchItems();
            }
        } catch (error) {
            console.error('Failed to delete item:', error);
        }
    };

    const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadingBulk(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet);

                const formattedItems = json.map(row => ({
                    name: row['Name'],
                    rate_per_kg: parseFloat(row['Rate']),
                    stock_kg: parseFloat(row['Stock']) || 0,
                    piece_price: row['Piece Price'] ? parseFloat(row['Piece Price']) : null,
                    piece_weight_kg: row['Piece Weight (g)'] ? parseFloat(row['Piece Weight (g)']) / 1000 : null,
                    track_stock: row['Track Stock'] !== undefined ? (String(row['Track Stock']).toUpperCase() === 'TRUE' || row['Track Stock'] === 1) : true
                }));

                const res = await fetch('/api/items/bulk', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ items: formattedItems }),
                });

                if (res.ok) {
                    alert('Items uploaded successfully!');
                    fetchItems();
                } else {
                    const errorData = await res.json();
                    alert(`Failed to upload items: ${errorData.error || res.statusText}`);
                }
            } catch (error) {
                console.error('Error processing bulk upload:', error);
                alert('Error processing file. Please ensure it is a valid Excel file with "Name", "Rate", and "Stock" columns. Optional: "Piece Price", "Piece Weight (g)", "Track Stock".');
            } finally {
                setUploadingBulk(false);
                event.target.value = ''; // Clear the input
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleExportExcel = () => {
        if (!data.logs || data.logs.length === 0) {
            alert('No data to export.');
            return;
        }

        const ws = XLSX.utils.json_to_sheet(data.logs.map((log: any) => {
            const itemsArr = typeof log.items === 'string' ? JSON.parse(log.items || '[]') : (log.items || []);
            return {
                'Transaction ID': log.id,
                'Date': new Date(log.created_at).toLocaleString(),
                'Total Amount (₹)': log.total_amount,
                'Items': itemsArr.map((item: any) => `${item.name} (${item.quantity_kg}${item.unit === 'pc' ? ' pc' : 'kg'} @ ₹${item.calculated_price})`).join('; '),
            };
        }));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');
        XLSX.writeFile(wb, `Sales_Report_${startDate}_to_${endDate}.xlsx`);
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-sm w-full">
                    <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Admin Access</h1>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <input
                                type="password"
                                placeholder="Enter Admin Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                className="w-full text-sm px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-center text-gray-900 mb-4 shadow-sm"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-200"
                        >
                            Login
                        </button>
                    </form>
                    <div className="mt-6 text-center">
                        <Link href="/" className="text-sm font-medium text-indigo-500 hover:text-indigo-700">
                            &larr; Back to POS
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <h1 className="text-2xl font-bold text-gray-800">Admin Portal</h1>
                    <div className="flex gap-3">
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
                        <button onClick={() => setIsAuthenticated(false)} className="text-sm font-medium text-gray-600 hover:text-gray-800 bg-gray-100 px-4 py-2 rounded-lg transition-colors">
                            Logout
                        </button>
                        <Link href="/">
                            <button className="text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-4 py-2 rounded-lg transition-colors">
                                Back to POS
                            </button>
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Add Item Form */}
                    <div className="md:col-span-1">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <Plus size={20} className="text-indigo-500" /> Add New Sweet
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                                        placeholder="e.g. Kaju Katli"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rate per KG (₹)</label>
                                    <input
                                        type="number"
                                        value={rate}
                                        onChange={(e) => setRate(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                                        placeholder="e.g. 1000"
                                        min="0"
                                        step="0.01"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock (KG)</label>
                                    <input
                                        type="number"
                                        value={stock}
                                        onChange={(e) => setStock(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                                        placeholder="0"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 mt-2">
                                    <div className="col-span-2">
                                        <p className="text-sm font-medium text-gray-700 mb-2 border-b border-gray-100 pb-2">Optional: Piece Pricing</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Price per Piece (₹)</label>
                                        <input
                                            type="number"
                                            value={piecePrice}
                                            onChange={(e) => setPiecePrice(e.target.value)}
                                            className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                                            placeholder="e.g. 20"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Weight of 1 piece (Grams)</label>
                                        <input
                                            type="number"
                                            value={pieceWeight}
                                            onChange={(e) => setPieceWeight(e.target.value)}
                                            className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                                            placeholder="e.g. 50"
                                            min="0"
                                            step="1"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pt-2 pb-2">
                                    <input
                                        type="checkbox"
                                        id="track_stock_checkbox"
                                        checked={trackStock}
                                        onChange={(e) => setTrackStock(e.target.checked)}
                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                                    />
                                    <label htmlFor="track_stock_checkbox" className="text-sm font-medium text-gray-700 select-none cursor-pointer">
                                        Track Stock (Prevent orders if Out of Stock)
                                    </label>
                                </div>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center disabled:opacity-70"
                                >
                                    {submitting ? <Loader2 size={20} className="animate-spin" /> : 'Add Item'}
                                </button>
                            </form>

                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                    <Upload size={16} className="text-emerald-500" /> Bulk Import
                                </h3>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls"
                                        onChange={handleBulkUpload}
                                        disabled={uploadingBulk}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                    />
                                    <div className={`w-full border-2 border-dashed rounded-lg p-4 text-center transition-colors ${uploadingBulk ? 'bg-gray-50 border-gray-200' : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100'}`}>
                                        {uploadingBulk ? (
                                            <span className="flex items-center justify-center gap-2 text-sm font-medium text-gray-500"><Loader2 size={16} className="animate-spin" /> Processing...</span>
                                        ) : (
                                            <span className="text-sm font-medium text-emerald-700">Click or drag .xlsx file to bulk add items</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2 text-center">Required columns: Name, Rate, Stock</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items List */}
                    <div className="md:col-span-2">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-[600px] flex flex-col">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    Inventory List <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{filteredItems.length} items</span>
                                </h2>
                                <div className="relative w-full sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search inventory..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2">
                                {loading ? (
                                    <div className="flex justify-center items-center h-full">
                                        <Loader2 size={32} className="animate-spin text-indigo-500" />
                                    </div>
                                ) : filteredItems.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                        <Package size={48} className="mb-4 opacity-20" />
                                        <p>No items match your search.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {filteredItems.map((item: any) => (
                                            <div key={item.id} className="flex justify-between items-center p-4 border border-gray-100 rounded-lg hover:border-indigo-100 hover:bg-indigo-50/30 transition-all group">
                                                <div className="flex-1">
                                                    <p className="font-semibold text-gray-800">{item.name}</p>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm text-gray-500">₹{item.rate_per_kg.toFixed(2)}/kg</p>
                                                        {item.piece_price && (
                                                            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">
                                                                ₹{item.piece_price} / pc ({item.piece_weight_kg ? item.piece_weight_kg * 1000 : 0}g)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className={`px-3 py-1 text-sm font-semibold rounded-full border ${item.stock_kg && item.stock_kg > 5 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                                        {item.stock_kg ?? 0} kg stock
                                                    </div>

                                                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <input
                                                            type="number"
                                                            placeholder="+ kg"
                                                            className="w-16 px-2 py-1 text-sm border border-gray-200 rounded-md outline-none focus:border-indigo-400 text-gray-900 placeholder:text-gray-400"
                                                            id={`add-stock-${item.id}`}
                                                            min="0.1"
                                                            step="0.1"
                                                        />
                                                        <button
                                                            onClick={async () => {
                                                                const el = document.getElementById(`add-stock-${item.id}`) as HTMLInputElement;
                                                                const addVal = Number(el?.value);
                                                                if (!addVal || addVal <= 0) return;
                                                                try {
                                                                    const res = await fetch(`/api/items/${item.id}`, {
                                                                        method: 'PUT',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ add_stock_kg: addVal })
                                                                    });
                                                                    if (res.ok) {
                                                                        el.value = '';
                                                                        fetchItems();
                                                                    } else {
                                                                        alert('Failed to add stock');
                                                                    }
                                                                } catch (e) { console.error('Error adding stock:', e); }
                                                            }}
                                                            className="bg-indigo-50 text-indigo-600 px-2 py-1 text-sm rounded-md font-medium hover:bg-indigo-100 transition-colors"
                                                        >
                                                            Add
                                                        </button>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                        title="Delete Item"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Analytics Section Integrated from Dashboard */}
            <div className="mt-12 pt-8 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Activity className="text-indigo-600" size={24} /> Daily Sales Analytics
                    </h2>
                    <button
                        onClick={handleExportExcel}
                        disabled={loadingAnalytics || data.logs.length === 0}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-medium transition-colors border border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download size={16} />
                        Export Detailed Report (XLSX)
                    </button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Monthly Sales Data ({new Date(startDate).toLocaleString('default', { month: 'short', year: 'numeric' })})</p>
                            <h3 className="text-3xl font-black text-emerald-600">
                                ₹{(data.monthlySales || 0).toLocaleString('en-IN')}
                            </h3>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <IndianRupee size={24} />
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Range Revenue</p>
                            <h3 className="text-3xl font-black text-gray-900">
                                ₹{data.logs.reduce((sum: number, tx: any) => sum + tx.total_amount, 0).toLocaleString('en-IN')}
                            </h3>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <IndianRupee size={24} />
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Total Orders</p>
                            <h3 className="text-3xl font-black text-gray-900">{data.logs.length}</h3>
                        </div>

                    </div>
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Package size={24} />
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Avg Order Value</p>
                        <h3 className="text-3xl font-black text-gray-900">
                            ₹{data.logs.length > 0 ? (data.logs.reduce((sum: number, tx: any) => sum + tx.total_amount, 0) / data.logs.length).toFixed(2) : '0.00'}
                        </h3>
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
                        {loadingAnalytics ? (
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

                {/* Top Sellers (Daily) */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">Items Sold in Range</h2>
                    <div className="flex-1 overflow-y-auto pr-2 max-h-[300px]">
                        {loadingAnalytics ? (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">Loading items...</div>
                        ) : data.topSellers.length > 0 ? (
                            <div className="space-y-4">
                                {data.topSellers.map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center shrink-0">
                                                #{idx + 1}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-800 line-clamp-1">{item.item_name}</p>
                                                <p className="text-xs text-gray-500">{parseFloat(item.total_qty).toFixed(2)} kg sold</p>
                                            </div>
                                        </div>
                                        <div className="font-bold text-gray-800">
                                            ₹{item.total_revenue.toLocaleString('en-IN')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">No data</div>
                        )}
                    </div>
                </div>

                {/* Top Sellers (Monthly) */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">Top 10 Sellers ({new Date(startDate).toLocaleString('default', { month: 'short' })})</h2>
                    <div className="flex-1 overflow-y-auto pr-2 max-h-[300px]">
                        {loadingAnalytics ? (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">Loading items...</div>
                        ) : data.topMonthlySellers?.length > 0 ? (
                            <div className="space-y-4">
                                {data.topMonthlySellers.map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 font-bold text-xs flex items-center justify-center shrink-0">
                                                #{idx + 1}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-800 line-clamp-1">{item.item_name}</p>
                                                <p className="text-xs text-gray-500">{parseFloat(item.total_qty).toFixed(2)} kg sold</p>
                                            </div>
                                        </div>
                                        <div className="font-bold text-gray-800">
                                            ₹{item.total_revenue.toLocaleString('en-IN')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">No data</div>
                        )}
                    </div>
                </div>

                {/* Low Stock Alerts Widget */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
                    <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
                        Low Stock Alerts
                    </h2>
                    <div className="flex-1 overflow-y-auto pr-2 max-h-[300px]">
                        {loading ? (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">Scanning inventory...</div>
                        ) : (() => {
                            const lowStockItems = items.filter(item => item.track_stock !== false && (item.stock_kg || 0) <= (item.unit === 'pc' ? 15 : 2.5));

                            if (lowStockItems.length === 0) {
                                return (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-emerald-500 gap-2">
                                        <svg className="w-12 h-12 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        <p className="font-medium text-gray-600">All stocks look healthy!</p>
                                    </div>
                                );
                            }

                            return (
                                <div className="space-y-3">
                                    {lowStockItems.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-red-50/50 p-3 rounded-xl border border-red-100">
                                            <div>
                                                <p className="font-bold text-gray-800">{item.name}</p>
                                                <p className="text-xs text-gray-500">Threshold: {item.unit === 'pc' ? '15 pc' : '2.50 kg'}</p>
                                            </div>
                                            <div className="bg-white px-3 py-1.5 rounded-lg border border-red-200 shadow-sm text-center min-w-[70px]">
                                                <p className="text-xs font-bold text-red-600">
                                                    {item.stock_kg || 0} {item.unit || 'kg'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* Daily Expenses Widget */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
                    <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <IndianRupee className="text-orange-500" size={20} />
                        Daily Expenses
                    </h2>

                    <form onSubmit={handleExpenseSubmit} className="flex gap-2 mb-4 shrink-0">
                        <input
                            type="text"
                            placeholder="Expense Name"
                            value={expenseName}
                            onChange={(e) => setExpenseName(e.target.value)}
                            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-gray-900"
                            required
                        />
                        <input
                            type="number"
                            placeholder="Amount"
                            value={expenseAmount}
                            onChange={(e) => setExpenseAmount(e.target.value)}
                            className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-gray-900"
                            required
                            min="1"
                        />
                        <button
                            type="submit"
                            disabled={submittingExpense}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shrink-0 flex items-center justify-center p-2"
                        >
                            <Plus size={16} />
                        </button>
                    </form>

                    <div className="flex-1 overflow-y-auto pr-2 max-h-[240px]">
                        {loadingExpenses ? (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">Loading expenses...</div>
                        ) : expenses.length > 0 ? (
                            <div className="space-y-3">
                                {expenses.map((exp: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <div>
                                            <p className="font-bold text-gray-800">{exp.name}</p>
                                            <p className="text-xs text-gray-500">{new Date(exp.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                        <div className="font-bold text-red-600">
                                            -₹{exp.amount.toLocaleString('en-IN')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                                <svg className="w-10 h-10 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"></path></svg>
                                <span>No expenses recorded</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Inventory & Logs Rows */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8 mt-6">
                {/* Inventory Stats (Added vs Sold) */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col h-[500px]">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-800">Inventory Movement</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-white shadow-sm z-10">
                                <tr>
                                    <th className="py-2 text-sm font-semibold text-gray-600 border-b border-gray-100">Item Name</th>
                                    <th className="py-2 text-sm font-semibold text-gray-600 border-b border-gray-100 text-center">Historical Total Sold</th>
                                    <th className="py-2 text-sm font-semibold text-gray-600 border-b border-gray-100 text-center">Current Stock</th>
                                    <th className="py-2 text-sm font-semibold text-gray-600 border-b border-gray-100 text-center">Approx Added</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.inventoryStats?.map((stat: any) => {
                                    const approxAdded = stat.current_stock + stat.total_sold;
                                    return (
                                        <tr key={stat.id} className="hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors">
                                            <td className="py-3 pr-2 text-sm font-medium text-gray-800">{stat.name}</td>
                                            <td className="py-3 px-2 text-sm text-center text-indigo-600 font-semibold">{stat.total_sold.toFixed(2)} {stat.unit || 'kg'}</td>
                                            <td className="py-3 px-2 text-sm text-center font-bold text-emerald-600">{stat.current_stock.toFixed(2)} {stat.unit || 'kg'}</td>
                                            <td className="py-3 pl-2 text-sm text-center text-gray-500">{approxAdded.toFixed(2)} {stat.unit || 'kg'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Transaction Logs */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col h-[500px]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <h2 className="text-lg font-bold text-gray-800">Transaction Logs</h2>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search Name, Phone, Product..."
                                value={logSearch}
                                onChange={(e) => setLogSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-white shadow-sm z-10">
                                <tr>
                                    <th className="py-2 text-sm font-semibold text-gray-600 border-b border-gray-100">Receipt</th>
                                    <th className="py-2 text-sm font-semibold text-gray-600 border-b border-gray-100">Customer</th>
                                    <th className="py-2 text-sm font-semibold text-gray-600 border-b border-gray-100 text-center">Payment Mode</th>
                                    <th className="py-2 text-sm font-semibold text-gray-600 border-b border-gray-100 text-right">Amount</th>
                                    <th className="py-2 text-sm font-semibold text-gray-600 border-b border-gray-100 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.logs?.filter((log: any) => {
                                    if (!logSearch) return true;
                                    const searchLower = logSearch.toLowerCase();
                                    const itemsArr = typeof log.items === 'string' ? JSON.parse(log.items || '[]') : (log.items || []);
                                    const itemsMatch = itemsArr.some((item: any) => item.name.toLowerCase().includes(searchLower));
                                    const customerMatch = log.customer_name?.toLowerCase().includes(searchLower) || log.customer_mobile?.toLowerCase().includes(searchLower);
                                    return itemsMatch || customerMatch;
                                }).map((log: any) => (
                                    <tr key={log.id} className="hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors">
                                        <td className="py-3 pr-2 text-sm text-gray-800 font-mono">
                                            {log.receipt_no}
                                            <div className="text-[10px] text-gray-500 mt-0.5">{new Date(log.created_at).toLocaleTimeString('en-US')}</div>
                                        </td>
                                        <td className="py-3 px-2 text-sm font-medium text-gray-700">
                                            {log.customer_name ? (
                                                <span className="font-semibold text-gray-800">{log.customer_name}</span>
                                            ) : (
                                                <span className="text-gray-400 italic">Walk-in</span>
                                            )}
                                            {log.customer_mobile && <div className="text-xs font-normal text-gray-500">{log.customer_mobile}</div>}
                                        </td>
                                        <td className="py-3 px-2 text-center align-middle">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${log.payment_mode === 'Online' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                                {log.payment_mode}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2 text-sm font-bold text-gray-900 text-right align-middle">
                                            ₹{log.total_amount.toFixed(2)}
                                        </td>
                                        <td className="py-3 pl-2 text-center">
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1 rounded-md text-xs font-semibold transition-colors border border-indigo-100"
                                            >
                                                View/Print
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Reprint Modal */}
            {
                selectedLog && (
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
                )
            }
        </div >
    );
}

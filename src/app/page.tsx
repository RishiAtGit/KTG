"use client";
import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, LogOut, UserCog, BarChart3, Search, Trash2, Printer, Check, Smartphone, PrinterIcon, Share2, CreditCard, Banknote, Lock } from 'lucide-react';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import ReceiptTemplate from '@/components/ReceiptTemplate';

// ─── POS Password ─────────────────────────────────────────────────────────────
const POS_PASSWORD = 'ktg2026'; // Change this to your desired password
const POS_AUTH_KEY = 'pos_authenticated';
// ─────────────────────────────────────────────────────────────────────────────

interface Item {
  id: number;
  name: string;
  rate_per_kg: number;
  created_at: string;
  stock_kg?: number;
  unit?: string;
  piece_price?: number;
  piece_weight_kg?: number;
  track_stock?: boolean;
}

interface CartItem extends Item {
  cartId: string;
  quantity_kg: number; // for inventory
  calculated_price: number;
  selling_type: 'kg' | 'pc';
  selling_qty: number; // 5 pc, or 500 grams
}

export default function POSPage() {
  // ── Auth gate ──────────────────────────────────────────────────────────────
  const [authenticated, setAuthenticated] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(POS_AUTH_KEY);
      if (stored === 'true') setAuthenticated(true);
      setAuthChecked(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPassword === POS_PASSWORD) {
      sessionStorage.setItem(POS_AUTH_KEY, 'true');
      setAuthenticated(true);
      setLoginError(false);
    } else {
      setLoginError(true);
      setLoginPassword('');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(POS_AUTH_KEY);
    setAuthenticated(false);
    setLoginPassword('');
  };
  // ─────────────────────────────────────────────────────────────────────────

  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');

  const [discountType, setDiscountType] = useState<'% Off' | '₹ Off'>('% Off');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Online' | null>(null);

  // Checkout State
  const [receiptNo, setReceiptNo] = useState<string>('');

  useEffect(() => {
    if (cart.length > 0 && !receiptNo) {
      fetch('/api/receipt-sequence')
        .then(res => res.json())
        .then(data => {
          if (data.receipt_no) {
            setReceiptNo(data.receipt_no);
          } else {
            setReceiptNo(`INV-${Date.now().toString().slice(-6)}`);
          }
        })
        .catch(() => setReceiptNo(`INV-${Date.now().toString().slice(-6)}`));
    } else if (cart.length === 0) {
      setReceiptNo('');
    }
  }, [cart.length, receiptNo]);

  // Calculator state
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [inputWeight, setInputWeight] = useState('');
  const [inputPrice, setInputPrice] = useState('');
  const [sellType, setSellType] = useState<'kg' | 'pc'>('kg');

  const weightInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard Navigation State
  const [focusedItemIndex, setFocusedItemIndex] = useState<number>(0);

  // Search auto-focus on mount
  useEffect(() => {
    // Focus search on mount
    searchInputRef.current?.focus();
  }, []);

  const fetchItems = () => {
    fetch('/api/items')
      .then(res => res.json())
      .then(data => {
        setItems(data);
      });
  };

  // Fetch Items on Mount and Poll every 10 seconds
  useEffect(() => {
    fetchItems();
    const intervalId = setInterval(fetchItems, 10000);
    return () => clearInterval(intervalId);
  }, []);

  // Search filter
  useEffect(() => {
    setFilteredItems(
      items.filter(item => item.name.toLowerCase().includes(search.toLowerCase()))
    );
  }, [search, items]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F1: Focus Search
      if (e.key === 'F1') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setFocusedItemIndex(0); // reset navigation
      }
      // F9: Checkout
      if (e.key === 'F9') {
        e.preventDefault();
        if (cart.length > 0) {
          if (!paymentMode) {
            alert('Please select a payment mode matching F9 flow');
            // Optionally auto-select cash if they push F9, but user said mandatory
            // so we leave it as alert
          } else {
            completeOrder();
          }
        }
      }
      // Escape: Close Calculator / Clear Selection
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedItem(null);
        setInputWeight('');
        setInputPrice('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, customerName, customerMobile, customerGstin, discountValue, paymentMode]);

  // 2-Way Sync
  const handleWeightChange = (val: string) => {
    setInputWeight(val);
    if (selectedItem && val !== '') {
      const qty = parseFloat(val);
      let price = 0;
      if (sellType === 'pc' && selectedItem.piece_price) {
        price = qty * selectedItem.piece_price;
      } else {
        price = (qty / 1000) * selectedItem.rate_per_kg;
      }
      setInputPrice(price.toFixed(2));
    } else {
      setInputPrice('');
    }
  };

  const handlePriceChange = (val: string) => {
    setInputPrice(val);
    if (selectedItem && val !== '') {
      const price = parseFloat(val);
      if (sellType === 'pc' && selectedItem.piece_price) {
        const pcs = price / selectedItem.piece_price;
        setInputWeight(pcs.toFixed(0)); // Pieces should be whole numbers
      } else {
        const kg = price / selectedItem.rate_per_kg;
        const grams = kg * 1000;
        setInputWeight(grams.toFixed(0));
      }
    } else {
      setInputWeight('');
    }
  };

  const addToCart = () => {
    if (!selectedItem || !inputWeight || !inputPrice) return;

    const qty = parseFloat(inputWeight);
    const price = parseFloat(inputPrice);

    if (qty <= 0 || price <= 0) return;

    let deduction_kg = 0;
    if (sellType === 'pc') {
      deduction_kg = qty * (selectedItem.piece_weight_kg || 0);
    } else {
      deduction_kg = qty / 1000;
    }

    const currentStock = selectedItem.stock_kg || 0;
    const isTrackingStock = selectedItem.track_stock !== false;

    if (isTrackingStock && currentStock <= 0) {
      alert(`Out of stock! Please add up the stock for ${selectedItem.name}.`);
      return;
    }

    // Check if the total quantity in cart + requested quantity exceeds stock
    const existingInCart = cart.find(item => item.id === selectedItem.id);
    const totalRequested = deduction_kg + (existingInCart ? existingInCart.quantity_kg : 0);

    if (isTrackingStock && currentStock < totalRequested) {
      alert(`Insufficient stock! Only ${currentStock.toFixed(2)} kg available for ${selectedItem.name}.`);
      return;
    }

    const newItem: CartItem = {
      ...selectedItem,
      cartId: Math.random().toString(36).substr(2, 9),
      quantity_kg: deduction_kg,
      calculated_price: price,
      selling_type: sellType,
      selling_qty: qty
    };

    setCart([...cart, newItem]);
    setSelectedItem(null);
    setInputWeight('');
    setInputPrice('');
    setSellType('kg');
  };

  const removeFromCart = (cartId: string) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.calculated_price, 0);
  let discountAmount = 0;
  if (discountType === '₹ Off') {
    discountAmount = discountValue;
  } else { // % Off
    discountAmount = (subtotal * discountValue) / 100;
  }
  const totalAmount = Math.max(0, subtotal - discountAmount);


  const generatePayload = () => ({
    receipt_no: receiptNo,
    customer_name: customerName,
    customer_mobile: customerMobile,
    customer_gstin: customerGstin,
    total_amount: totalAmount,
    subtotal,
    discount_amount: discountAmount,
    payment_mode: paymentMode || 'Pending',
    items: cart
  });

  const completeOrder = async (modeOverride?: 'Cash' | 'Online') => {
    if (cart.length === 0) return alert('Cart is empty!');
    const mode = modeOverride || paymentMode;
    if (!mode) return alert('Please select a payment mode first!');

    const payload = { ...generatePayload(), payment_mode: mode };

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        // Reset Cart and Refetch Inventory globally to update stock
        setCart([]);
        setCustomerName('');
        setCustomerMobile('');
        setCustomerGstin('');
        setDiscountValue(0);
        setPaymentMode(null);
        setReceiptNo('');
        fetchItems();
      }
    } catch (e) {
      console.error(e);
      alert('Failed to complete order');
    }
  };

  const executePrint = async (type: 'BILL' | 'KOT') => {
    if (cart.length === 0) return;
    const payload = generatePayload();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      try {
        const { renderToString } = await import('react-dom/server');
        const html = renderToString(<ReceiptTemplate type={type} payload={payload} />);

        let shareHtml = '';
        if (type === 'BILL') {
          shareHtml = `
              <div class="no-print" style="text-align: center; margin: 15px 0; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                <button id="wa-share-btn" style="background-color: #25D366; color: white; padding: 10px 18px; border-radius: 5px; font-family: sans-serif; font-weight: bold; border: none; cursor: pointer;">📲 Send on WhatsApp</button>
                <button onclick="window.print()" style="background-color: #4F46E5; color: white; padding: 10px 18px; border-radius: 5px; font-family: sans-serif; font-weight: bold; border: none; cursor: pointer;">🖨 Print Again</button>
                <button onclick="window.close()" style="background-color: #f3f4f6; color: #374151; padding: 10px 18px; border-radius: 5px; font-family: sans-serif; font-weight: bold; border: 1px solid #d1d5db; cursor: pointer;">← Back to POS</button>
                <p id="share-status" style="width:100%; margin-top: 4px; font-size: 13px; font-family: sans-serif; color: #4b5563;"></p>
              </div>
            `;
        } else {
          shareHtml = `
              <div class="no-print" style="text-align: center; margin: 15px 0;">
                <button onclick="window.print()" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-family: sans-serif; font-weight: bold; border: none; cursor: pointer;">Print Again</button>
              </div>
            `;
        }

        printWindow.document.write(`
          <html>
            <head>
              <title>Print ${type}</title>
              <script src="https://cdn.tailwindcss.com"></script>
              <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
              <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
              <style>
                @media print {
                  body { margin: 0; padding: 0; }
                  .receipt-container { width: 80mm !important; margin: 0 auto; border: none !important; }
                  .no-print { display: none !important; }
                }
                body { background: #f0f0f0; padding-top: 20px; padding-bottom: 20px; }
              </style>
            </head>
            <body>
              ${shareHtml}
              <div id="capture-area">
                ${html}
              </div>
              <script>
                // Attach shop title close functionality
                const shopTitle = document.getElementById('shop-title');
                if (shopTitle) {
                    shopTitle.style.cursor = 'pointer';
                    shopTitle.title = 'Click to close print window';
                    shopTitle.addEventListener('click', () => window.close());
                }

                // Auto-print on load
                window.onload = () => {
                  setTimeout(() => {
                    window.print();
                  }, 500);
                };

                // WhatsApp Link Logic
                const shareBtn = document.getElementById('wa-share-btn');
                const statusTxt = document.getElementById('share-status');
                
                if (shareBtn) {
                  shareBtn.addEventListener('click', async () => {
                     // Since we don't have a public domain yet, we'll assume the URL is structured like this. 
                     // Usually you would save the log to DB first and then return the ID. Because it's already saved on F9, we can just link to it via receipt_no.
                     const receiptNo = '${payload.receipt_no}';
                     const publicLink = window.location.origin + '/receipt/' + encodeURIComponent(receiptNo);
                     const phone = '${payload.customer_mobile}';
                     
                     if (!phone) {
                         statusTxt.style.color = '#dc2626';
                         statusTxt.innerText = 'No mobile number provided for this customer.';
                         return;
                     }

                     const text = \`*KTG Family Restaurant*\nHere is your bill: \${publicLink}\nThank you for visiting!\`;
                     const waUrl = \`https://wa.me/91\${phone}?text=\${encodeURIComponent(text)}\`;
                     
                     window.open(waUrl, '_blank');
                     
                     statusTxt.style.color = '#059669';
                     statusTxt.innerText = 'WhatsApp web opened with link!';
                  });
                }
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      } catch (e) {
        console.error("Print generation failed:", e);
        printWindow.close();
      }
    } else {
      alert("Please allow popups to print.");
    }
  };

  const shareWhatsApp = () => {
    if (cart.length === 0) return;
    if (!customerMobile) {
      alert("No customer mobile number provided for WhatsApp share.");
      return;
    }

    const payload = generatePayload();

    const text = `*KRISHNA Sweets & Snacks*\nReceipt: ${payload.receipt_no}\nTotal: ₹${payload.total_amount.toFixed(2)}\nThank you for shopping!`;
    const url = `https://wa.me/91${payload.customer_mobile}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Show nothing until auth is checked (avoids flash)
  if (!authChecked) return null;

  // ── Login Gate ──────────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 w-full max-w-sm shadow-2xl border border-white/20">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-xl mb-4">
              <Lock size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">KTG Sweets POS</h1>
            <p className="text-indigo-200 text-sm mt-1">Enter your password to continue</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="relative">
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => { setLoginPassword(e.target.value); setLoginError(false); }}
                autoFocus
                autoComplete="new-password"
                className={`w-full px-4 py-3 rounded-xl bg-white/10 border text-white placeholder:text-indigo-300 outline-none text-center text-lg tracking-widest transition-all ${loginError ? 'border-red-400 bg-red-500/10' : 'border-white/20 focus:border-indigo-400 focus:bg-white/15'
                  }`}
              />
            </div>
            {loginError && (
              <p className="text-red-300 text-sm text-center -mt-2 animate-in fade-in">Incorrect password. Try again.</p>
            )}
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/50 transition-all active:scale-95"
            >
              Unlock POS
            </button>
          </form>

          <p className="text-center text-indigo-400 text-xs mt-6">KTG Family Restaurant &bull; Billing System</p>
        </div>
      </div>
    );
  }
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">

      {/* Sidebar for Navigation */}
      <div className="w-16 bg-indigo-900 border-r border-indigo-800 flex flex-col items-center py-6 shadow-xl z-20">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 mb-8 flex items-center justify-center shadow-lg text-white font-bold text-xl">
          S
        </div>
        <div className="flex flex-col gap-6 w-full">
          <Link href="/" className="flex justify-center text-white p-3 mx-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all shadow-inner">
            <ShoppingCart size={22} />
          </Link>
          <Link href="/dashboard" className="flex justify-center text-indigo-300 hover:text-white p-3 mx-2 rounded-xl hover:bg-white/10 transition-all">
            <BarChart3 size={22} />
          </Link>
          <Link href="/admin" className="flex justify-center text-indigo-300 hover:text-white p-3 mx-2 rounded-xl hover:bg-white/10 transition-all">
            <UserCog size={22} />
          </Link>
        </div>
        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Lock POS"
          className="mt-auto flex justify-center text-indigo-400 hover:text-red-300 p-3 mx-2 rounded-xl hover:bg-white/10 transition-all"
        >
          <Lock size={20} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full bg-slate-50 relative">

        {/* Header Search */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center px-6 shadow-sm z-10">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search sweets (F1)..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setFocusedItemIndex(0); // Reset index on new search
              }}
              onKeyDown={(e) => {
                if (filteredItems.length === 0) return;

                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  setFocusedItemIndex(prev => (prev + 1) % filteredItems.length);
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  setFocusedItemIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  const targetItem = filteredItems[focusedItemIndex];
                  if (targetItem) {
                    setSelectedItem(targetItem);
                    setTimeout(() => weightInputRef.current?.focus(), 50);
                  }
                }
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm bg-gray-50 focus:bg-white text-gray-900"
            />
          </div>
          <div className="ml-auto text-sm font-medium text-gray-500">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-24">
            {filteredItems.map((item, index) => (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedItem(item);
                  setSellType('kg');
                  setInputWeight('');
                  setInputPrice('');
                  setTimeout(() => weightInputRef.current?.focus(), 50);
                }}
                className={`bg-white rounded-xl p-3 shadow-sm border-2 cursor-pointer transition-all hover:shadow-md ${selectedItem?.id === item.id ? 'border-indigo-500 ring-4 ring-indigo-50/50' : focusedItemIndex === index ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-transparent hover:border-gray-200'}`}
              >
                {/* Stock badge */}
                <div className="flex justify-between items-start mb-1">
                  <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${item.track_stock === false ? 'bg-gray-100 text-gray-600' : (item.stock_kg && item.stock_kg > 5 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600')}`}>
                    {item.track_stock === false ? '∞' : item.unit === 'pc' ? `${Math.round(item.stock_kg ?? 0)} pc` : `${Number(item.stock_kg ?? 0).toFixed(2)} kg`}
                  </div>
                </div>
                <h3 className="font-semibold text-gray-800 text-sm leading-tight mb-1.5 line-clamp-2">{item.name}</h3>
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs font-medium text-indigo-600">₹{item.rate_per_kg}/kg</p>
                  {item.piece_price && (
                    <p className="text-xs font-medium text-emerald-600">₹{item.piece_price}/pc</p>
                  )}
                </div>
              </div>
            ))}
            {filteredItems.length === 0 && (
              <div className="col-span-full h-40 flex items-center justify-center text-gray-400">
                No items found.
              </div>
            )}
          </div>
        </div>

        {/* Floating Calculator Modal (if item selected) */}
        {selectedItem && (
          <div className="absolute bottom-6 left-6 right-[390px] bg-white rounded-2xl shadow-2xl border border-indigo-100 p-6 z-30 animate-in slide-in-from-bottom-10 fade-in duration-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold border-b-2 border-indigo-200 pb-1 inline-block text-gray-800">{selectedItem.name}</h3>
                <div className="flex items-center gap-3 mt-2">
                  <p className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                    ₹{selectedItem.rate_per_kg}/kg
                  </p>
                  {selectedItem.piece_price && (
                    <p className="text-sm font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                      ₹{selectedItem.piece_price}/pc
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setSellType('kg');
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >✕</button>
            </div>

            {selectedItem.piece_price && (
              <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg w-max">
                <button
                  onClick={() => {
                    setSellType('kg');
                    setInputWeight('');
                    setInputPrice('');
                    setTimeout(() => weightInputRef.current?.focus(), 10);
                  }}
                  className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${sellType === 'kg' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Sell by Weight
                </button>
                <button
                  onClick={() => {
                    setSellType('pc');
                    setInputWeight('');
                    setInputPrice('');
                    setTimeout(() => weightInputRef.current?.focus(), 10);
                  }}
                  className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${sellType === 'pc' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Sell by Piece
                </button>
              </div>
            )}

            <div className="flex gap-3 items-end mt-2">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {sellType === 'pc' ? 'Quantity (Pieces)' : 'Weight (Grams)'}
                </label>
                <div className="relative">
                  <input
                    ref={weightInputRef}
                    type="number"
                    value={inputWeight}
                    onChange={(e) => handleWeightChange(e.target.value)}
                    style={{ minWidth: '160px' }}
                    className="w-full pl-4 pr-12 py-3 border-2 border-indigo-100 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none text-xl font-bold text-gray-800 transition-all placeholder:font-normal placeholder:text-gray-300"
                    placeholder="0"
                    min={sellType === 'pc' ? '1' : '0.1'}
                    step={sellType === 'pc' ? '1' : '10'}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addToCart();
                      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                        e.preventDefault();
                        priceInputRef.current?.focus();
                      }
                    }}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium whitespace-nowrap">
                    {sellType === 'pc' ? 'pc' : 'gm'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-center text-gray-300 pb-3 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                  <input
                    ref={priceInputRef}
                    type="number"
                    value={inputPrice}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    style={{ minWidth: '160px' }}
                    className="w-full pl-8 pr-4 py-3 border-2 border-indigo-100 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none text-xl font-bold text-gray-800 transition-all placeholder:font-normal placeholder:text-gray-300"
                    placeholder="0.00"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addToCart();
                      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                        e.preventDefault();
                        weightInputRef.current?.focus();
                      }
                    }}
                  />
                </div>
              </div>
              <button
                onClick={addToCart}
                disabled={!inputWeight || !inputPrice}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3 px-8 rounded-xl transition-all h-[52px] shadow-lg shadow-indigo-200 disabled:shadow-none"
              >
                Add to Bill (Enter)
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Cart Sidebar */}
      <div className="w-[400px] bg-white border-l border-gray-200 flex flex-col h-full shadow-2xl z-20">

        {/* Customer Details */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            Customer Details
          </h2>
          <div className="space-y-2">
            {/* Name + Mobile on one row, equal width */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="flex-1 basis-0 min-w-0 text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-gray-900"
              />
              <input
                type="tel"
                placeholder="Mobile"
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value)}
                className="flex-1 basis-0 min-w-0 text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-gray-900"
              />
            </div>
            <input
              type="text"
              placeholder="Customer GSTIN (Optional)"
              value={customerGstin}
              onChange={(e) => setCustomerGstin(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-gray-900 uppercase placeholder:normal-case"
            />
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
              <ShoppingCart size={48} className="mb-4 text-gray-300" />
              <p className="font-medium text-lg">Cart is empty</p>
              <p className="text-sm mt-1">Select items to start building.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item, idx) => (
                <div key={item.cartId} className="flex gap-3 bg-white border border-gray-100 p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow group">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0 self-center">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-800 truncate">{item.name}</h4>
                    <div className="flex gap-2 text-xs text-gray-500 mt-0.5">
                      <span>{item.selling_type === 'pc' ? `${item.selling_qty} pc` : (item.selling_qty >= 1000 ? `${(item.selling_qty / 1000).toFixed(2)} kg` : `${item.selling_qty} gm`)}</span>
                      <span>×</span>
                      <span>₹{item.selling_type === 'pc' ? item.piece_price : item.rate_per_kg}/{item.selling_type}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between shrink-0 ml-2">
                    <span className="font-bold text-gray-800">₹{item.calculated_price.toFixed(2)}</span>
                    <button
                      onClick={() => removeFromCart(item.cartId)}
                      className="text-red-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-50 rounded-md"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checkout Section */}
        <div className="p-5 bg-white border-t border-gray-200 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">

          {/* Discount */}
          <div className="mb-4 flex items-center gap-2">
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as '% Off' | '₹ Off')}
              className="bg-gray-100 border-none outline-none py-2 pl-3 text-sm font-medium text-gray-700 cursor-pointer rounded-l-lg hover:bg-gray-200 transition-colors"
              title="Discount Type"
            >
              <option value="% Off">% Off</option>
              <option value="₹ Off">₹ Off</option>
            </select>
            <input
              type="number"
              placeholder="Discount"
              value={discountValue || ''}
              onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
              className="w-full border border-gray-200 p-2 rounded-lg outline-none text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 text-gray-900"
            />
          </div>

          {/* 3-Button Checkout Row: Print KOT | Cash | Online */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            {/* Print KOT */}
            <button
              onClick={() => executePrint('KOT')}
              disabled={cart.length === 0}
              className="bg-amber-50 hover:bg-amber-100 disabled:opacity-50 border border-amber-200 text-amber-700 font-bold py-4 rounded-xl transition-colors flex flex-col items-center justify-center gap-1 shadow-sm text-xs"
            >
              <Printer size={20} />
              Print KOT
            </button>

            {/* Cash */}
            <button
              onClick={async () => {
                if (cart.length === 0) return;
                await executePrint('BILL');
                completeOrder('Cash');
              }}
              disabled={cart.length === 0}
              className="bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 border border-emerald-300 text-emerald-700 font-bold py-4 rounded-xl transition-colors flex flex-col items-center justify-center gap-1 shadow-sm text-xs"
            >
              <Banknote size={20} />
              Cash
            </button>

            {/* Online */}
            <button
              onClick={async () => {
                if (cart.length === 0) return;
                await executePrint('BILL');
                completeOrder('Online');
              }}
              disabled={cart.length === 0}
              className="bg-purple-50 hover:bg-purple-100 disabled:opacity-50 border border-purple-300 text-purple-700 font-bold py-4 rounded-xl transition-colors flex flex-col items-center justify-center gap-1 shadow-sm text-xs"
            >
              <CreditCard size={20} />
              Online
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}

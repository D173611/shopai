'use client'
import { useState, useEffect } from 'react' // 1. Added useEffect
import { createClient } from '../utils/supabase/client' // 2. Added supabase client
import CheckoutPanel from './CheckoutPanel'
import ProductImage from './ProductImage'
import ShareCashierLink from './ShareCashierLink'
import Link from 'next/link'
import { ExpiringSoonBanner } from './SubscriptionBanner'
import { Product, Branch } from './types'
import { User } from '@supabase/supabase-js'

export default function DashboardClient({
  shop,
  config,
  daysRemaining,
  branches,
  products: initialProducts,
  pendingOrdersCount,
  activeDebtsCount,
  totalSalesRevenue,
  lowStockItems,
  user, // ✅ ADDED
  createBranch,
  addProduct,
  deleteProduct,
  updateStock,
  updatePrice,
  updateBarcodeQty,
  logout
}: any) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [showInventory, setShowInventory] = useState(false)
  const [showIngest, setShowIngest] = useState(false)
  const [showBranches, setShowBranches] = useState(false)
  const [bulkStockValue, setBulkStockValue] = useState<{[key: string]: string}>({})
  const [symbol, setSymbol] = useState(shop?.country === 'Kenya'? 'KES' : shop?.country === 'Tanzania'? 'TZS' : shop?.country === 'Rwanda'? 'RWF' : 'UGX') // 3. Added symbol state - FIXED to use shop.country instantly
  const [uploadingVideos, setUploadingVideos] = useState<{[key: string]: boolean}>({}) // VIDEO ADD

  // 4. Added this useEffect to fetch currency symbol - FIXED with ilike + fallback map
  useEffect(() => {
    const fetchCurrency = async () => {
      const supabase = createClient()
      // fallback local map so it never stays UGX if DB fails
      const localMap: any = { Kenya: 'KES', Tanzania: 'TZS', Uganda: 'UGX', Rwanda: 'RWF', Nigeria: 'NGN', Ghana: 'GHS', Zambia: 'ZMW', 'South Africa': 'ZAR' }
      if (localMap[shop.country]) setSymbol(localMap[shop.country])

      const { data } = await supabase
    .from('currencies')
    .select('currency_symbol')
    .ilike('country', shop.country) // CHANGED eq to ilike so Kenya=kenya works
    .maybeSingle()
      if (data?.currency_symbol) setSymbol(data.currency_symbol)
    }
    if (shop?.country) fetchCurrency()
  }, [shop?.country])

  const handleBulkStockSubmit = async (e: React.FormEvent<HTMLFormElement>, productId: string, currentStock: number) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const qty = parseInt(bulkStockValue[productId] || '0')
    if (qty === 0) return
    formData.set('id', productId)
    formData.set('currentStock', currentStock.toString())
    formData.set('adjustment', qty.toString())
    await updateStock(formData)
    setBulkStockValue(prev => ({...prev, [productId]: ''}))
    setProducts(prev => prev.map(p =>
      p.id === productId? {...p, stock_quantity: p.stock_quantity + qty } : p
    ))
  }

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>, productId: string) => { // VIDEO ADD
    const files = e.target.files // VIDEO ADD
    if (!files || files.length === 0) return // VIDEO ADD
    setUploadingVideos(prev => ({...prev, [productId]: true})) // VIDEO ADD
    const supabase = createClient() // VIDEO ADD
    for (const file of Array.from(files)) { // VIDEO ADD
      const fileName = `${shop.id}/${productId}/${Date.now()}-${file.name}` // VIDEO ADD
      const { data, error } = await supabase.storage.from('product-videos').upload(fileName, file) // VIDEO ADD
      if (data) { // VIDEO ADD
        await supabase.from('product_videos').insert({ product_id: productId, video_url: data.path }) // VIDEO ADD
      } // VIDEO ADD
    } // VIDEO ADD
    setUploadingVideos(prev => ({...prev, [productId]: false})) // VIDEO ADD
    alert('Video uploaded!') // VIDEO ADD
  } // VIDEO ADD

  const stockAlertNotificationsPanel = lowStockItems.length > 0? (
    <div className="bg-amber-500/10 border-2 border-dashed border-amber-500/30 p-5 rounded-2xl space-y-3 shadow-sm backdrop-blur-sm">
      <div className="flex items-center space-x-2 text-amber-900">
        <span className="text-xl animate-bounce">⚠️</span>
        <h2 className="font-extrabold text-sm uppercase tracking-wider">Automated Warehouse Stock Alert Notifications</h2>
        <span className="bg-amber-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black animate-pulse">
          {lowStockItems.length} Critical Items
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {lowStockItems.map((item: Product) => (
          <div key={item.id} className="bg-white border-amber-200 p-3 rounded-xl shadow-xs flex justify-between items-center">
            <div>
              <span className="font-bold text-slate-900 text-xs block truncate max-w-[140px]">{item.name}</span>
              <span className="text-xs text-slate-700 font-mono">Code: {item.barcode}</span>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-lg font-black ${item.stock_quantity === 0? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
              {item.stock_quantity === 0? 'SOLD OUT' : `${item.stock_quantity} left`}
            </span>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <div className="min-h-screen">
      <div className="relative z-10 p-6 space-y-6">

        <nav className="bg-white/80 backdrop-blur-md p-4 rounded-xl shadow-sm flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <span className="bg-blue-600 text-white font-black px-3 py-1.5 rounded-lg text-lg">S-AI</span>
            <div>
              <h1 className="text-xl font-bold uppercase text-slate-900">{shop.name} Dashboard HQ</h1>
              <p className={`text-xs font-bold ${daysRemaining <= 7? 'text-amber-600' : 'text-green-600'}`}>
                {daysRemaining > 0? `${daysRemaining} days remaining` : 'Expired'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard/settings"
              className="bg-slate-600 hover:bg-slate-700 text-white text-sm font-bold px-4 py-2 rounded-xl"
            >
              ⚙️ Shop Settings
            </Link>
            <Link
              href="/dashboard/pay"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-xl"
            >
              💳 Renew Subscription
            </Link>
            <a href={`/${shop.slug}`} target="_blank" rel="noopener noreferrer" className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-4 py-2 rounded-xl text-sm border-blue-200 transition">
              🔗 Public Store: /{shop.slug}
            </a>
            <a href="/dashboard/staff" className="bg-slate-800 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-slate-700 transition">
              👥 Manage Staff
            </a>
            <a href="/dashboard/sales" className="bg-slate-100 text-slate-800 text-sm font-bold px-4 py-2 rounded-xl hover:bg-slate-200 transition">
              📊 Sales Ledger
            </a>
            <form action={logout}>
              <button className="bg-rose-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-rose-600 transition">
                Sign Out
              </button>
            </form>
          </div>
        </nav>

        {daysRemaining <= 7 && daysRemaining > 0 && (
          <ExpiringSoonBanner daysRemaining={daysRemaining} config={config} />
        )}

        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <span className="text-xl">🏪</span>
              <h3 className="font-bold text-base text-slate-900">What Customers See On Your Store</h3>
            </div>
            <Link
              href="/dashboard/settings"
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-bold"
            >
              Edit Info
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Location</span>
              <p className="text-slate-900 mt-1 font-medium">
                {shop.location? `📍 ${shop.location}` : <span className="text-slate-600 italic">Not set</span>}
              </p>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Contact</span>
              <p className="text-slate-900 mt-1 font-medium">
                {shop.contact_info? `📞 ${shop.contact_info}` : <span className="text-slate-600 italic">Not set</span>}
              </p>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Payment Methods</span>
              {shop.payment_methods && shop.payment_methods.length > 0? (
                <div className="mt-1 space-y-1">
                  {shop.payment_methods.map((pm: any, idx: number) => (
                    <div key={idx} className="text-xs">
                      <span className="font-semibold text-slate-900">💳 {pm.name}:</span>
                      <span className="text-slate-800"> {pm.details}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-600 italic mt-1">Not set</p>
              )}
            </div>
          </div>
        </div>

        <ShareCashierLink shopId={shop.id} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/dashboard/staff/orders" className="block">
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border shadow-sm hover:shadow-md hover:border-blue-300 transition">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">📡 Orders Pipeline</h2>
                  <p className="text-xs text-slate-700 mt-1">Accept and process incoming orders in real-time</p>
                </div>
                <span className="bg-blue-100 text-blue-800 text-sm font-black px-3 py-1 rounded-full">
                  {pendingOrdersCount || 0} pending
                </span>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/debts" className="block">
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border shadow-sm hover:shadow-md hover:border-amber-300 transition">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">💰 Debts Tracker</h2>
                  <p className="text-xs text-slate-700 mt-1">Manage customer debts and record payments</p>
                </div>
                <span className="bg-amber-100 text-amber-800 text-sm font-black px-3 py-1 rounded-full">
                  {activeDebtsCount || 0} active
                </span>
              </div>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-slate-900/90 backdrop-blur-md text-slate-100 p-6 rounded-2xl shadow-sm border-slate-800">
            <span className="text-xs uppercase font-bold text-slate-300 tracking-wider">Total Handled Revenue</span>
            <h2 className="text-3xl font-black font-mono text-emerald-400 mt-1">{symbol} {totalSalesRevenue.toLocaleString()}</h2>
          </div>
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border">
            <span className="text-xs uppercase font-bold text-slate-700 tracking-wider">Active Branch Nodes</span>
            <h2 className="text-3xl font-black font-mono text-slate-900 mt-1">{branches.length} Operational</h2>
          </div>
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border">
            <span className="text-xs uppercase font-bold text-slate-700 tracking-wider">Tracked Catalog Items</span>
            <h2 className="text-3xl font-black font-mono text-blue-600 mt-1">{products.length} SKUs</h2>
          </div>
        </div>

        {stockAlertNotificationsPanel}

        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-slate-900">
            <span className="text-xl">💳</span>
            <h3 className="font-bold text-base">Point of Sale (POS) Terminal Interface</h3>
          </div>
          <p className="text-xs text-slate-700">Initiate physical orders directly with real-time sync across {shop.country || "Uganda"}'s branches using the module panel below.</p>
          <CheckoutPanel
            products={products}
            shopId={shop.id}
            slug={shop.slug}
            cashierId={user.id} // ✅ FIXED: Real UUID instead of "admin"
            cashierName={user.email?.split('@')[0] || user.user_metadata?.name || 'Admin'} // ✅ FIXED
          />
        </div>

        {/* COLLAPSIBLE SECTIONS */}

        {/* 1. BRANCH DEPLOY - FULL WIDTH */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border shadow-sm overflow-hidden">
          <button
            onClick={() => setShowBranches(!showBranches)}
            className="w-full p-6 flex justify-between items-center hover:bg-slate-50/50 transition"
          >
            <div className="flex items-center space-x-2 text-blue-700">
              <span className="text-xl">📍</span>
              <h3 className="font-bold text-base text-slate-900">Deploy New Branch Node</h3>
              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full">{branches.length} active</span>
            </div>
            <span className="text-2xl text-slate-400">{showBranches? '−' : '+'}</span>
          </button>
          {showBranches && (
            <div className="p-6 pt-0 space-y-4 border-t">
              <p className="text-xs text-slate-700">Quickly spin up automated sales points across major administrative networks in {shop.country || "Uganda"}.</p>
              <form action={createBranch} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Branch Name</label>
                  <input
                    type="text"
                    name="branchName"
                    required
                    placeholder="e.g. Gulu Northern Hub"
                    className="w-full text-sm p-2.5 border rounded-xl bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition text-slate-900 placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Location Details</label>
                  <input
                    type="text"
                    name="location"
                    required
                    placeholder="Plot 4, Awach Road, Gulu"
                    className="w-full text-sm p-2.5 border rounded-xl bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition text-slate-900 placeholder:text-slate-500"
                  />
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-2.5 rounded-xl text-sm transition">
                  Create Branch Node
                </button>
              </form>
            </div>
          )}
        </div>

        {/* 2. INGEST PRODUCT - HALF WIDTH */}
        <div className="w-full md:w-1/2 ml-auto">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border shadow-sm overflow-hidden">
            <button
              onClick={() => setShowIngest(!showIngest)}
              className="w-full p-6 flex justify-between items-center hover:bg-slate-50/50 transition"
            >
              <div className="flex items-center space-x-2 text-slate-900">
                <span className="text-xl">📦</span>
                <h3 className="font-bold text-base">Ingest Catalog Product</h3>
              </div>
              <span className="text-2xl text-slate-400">{showIngest? '−' : '+'}</span>
            </button>
            {showIngest && (
              <div className="p-6 pt-0 space-y-4 border-t">
                <p className="text-xs text-slate-700">Add products with multiple images for variants like size/color.</p>
                <form action={addProduct} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Product Title</label>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="e.g. Nike Air Max - Red/Blue/Black"
                      className="w-full text-sm p-2.5 border rounded-xl bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition text-slate-900 placeholder:text-slate-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Cost ({symbol})</label>
                      <input
                        type="number"
                        name="costPrice"
                        required
                        min="0"
                        placeholder="3500"
                        className="w-full text-sm p-2.5 border rounded-xl bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition text-slate-900 placeholder:text-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Retail ({symbol})</label>
                      <input
                        type="number"
                        name="retailPrice"
                        required
                        min="0"
                        placeholder="5000"
                        className="w-full text-sm p-2.5 border rounded-xl bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition text-slate-900 placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">In Stock</label>
                      <input
                        type="number"
                        name="stockQuantity"
                        required
                        min="0"
                        placeholder="120"
                        className="w-full text-sm p-2.5 border rounded-xl bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition text-slate-900 placeholder:text-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Low Warning</label>
                      <input
                        type="number"
                        name="lowStockThreshold"
                        min="1"
                        placeholder="15"
                        className="w-full text-sm p-2.5 border rounded-xl bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition text-slate-900 placeholder:text-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Barcode Qty/PDF</label>
                      <input
                        type="number"
                        name="barcodeQty"
                        min="1"
                        defaultValue="1"
                        placeholder="1"
                        className="w-full text-sm p-2.5 border rounded-xl bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition text-slate-900 placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Product Images - Upload Multiple For Variants
                    </label>
                    <input
                      type="file"
                      name="productImages"
                      multiple
                      accept="image/*"
                      className="w-full text-sm p-2 border rounded-xl bg-slate-50 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 text-slate-900"
                    />
                    <p className="text-xs text-slate-700 mt-1">Select multiple images: red, blue, size variants, etc. First image = thumbnail</p>
                  </div>

                  <div> {/* VIDEO ADD */}
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Product Videos Optional</label> {/* VIDEO ADD */}
                    <input type="file" name="productVideos" multiple accept="video/*" className="w-full text-sm p-2 border rounded-xl bg-slate-50" /> {/* VIDEO ADD */}
                    <p className="text-xs text-slate-700 mt-1">Upload 10s videos. Shows ▶️ on product card. Optional</p> {/* VIDEO ADD */}
                  </div> {/* VIDEO ADD */}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">AI Studio Enhanced Image URL</label>
                    <input
                      type="url"
                      name="imageUrlAiEnhanced"
                      placeholder="https://.../product-ai-enhanced.jpg"
                      className="w-full text-sm p-2.5 border rounded-xl bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition text-slate-900 placeholder:text-slate-500"
                    />
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border">
                    <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Default Store Display Mode</span>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="imagePreference"
                          value="original"
                          defaultChecked
                          className="h-4 w-4 text-slate-600 border-slate-300 focus:ring-slate-500 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-slate-800">Original Photo Option</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="imagePreference"
                          value="ai"
                          className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-slate-800">AI Studio View Option ✨</span>
                      </label>
                    </div>
                  </div>

                  <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold p-2.5 rounded-xl text-sm transition">
                    Create Catalog Item
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* 3. INVENTORY LIST - HALF WIDTH */}
        <div className="w-full md:w-1/2 ml-auto">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border shadow-sm overflow-hidden">
            <button
              onClick={() => setShowInventory(!showInventory)}
              className="w-full p-6 flex justify-between items-center hover:bg-slate-50/50 transition"
            >
              <div className="flex items-center space-x-2">
                <span className="text-xl">📑</span>
                <h3 className="font-bold text-base text-slate-900">Tracked System Inventory List</h3>
                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full">{products.length} SKUs</span>
              </div>
              <span className="text-2xl text-slate-400">{showInventory? '−' : '+'}</span>
            </button>
            {showInventory && (
              <div className="p-6 pt-0 space-y-4 border-t">
                {products.length === 0? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
                    <span className="text-3xl block mb-2">🔭</span>
                    <h4 className="text-sm font-extrabold text-slate-900">Catalog Registry Empty</h4>
                    <p className="text-xs text-slate-700 mt-1">Use the ingestion form to map your first commercial product assets.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                    {products.map((item: Product) => {
                      const displayImageUrl = item.use_ai_enhanced
                 ? item.image_url_ai_enhanced || item.image_url || item.image_urls?.[0]
                        : item.image_url || item.image_urls?.[0] || item.image_url_ai_enhanced

                      return (
                        <div key={item.id} className="border border-slate-100 bg-slate-50/50 p-4 rounded-2xl space-y-3 hover:border-slate-200 transition">
                          <div className="flex justify-between items-start">
                            <div className="flex items-start space-x-3">
                              <ProductImage
                                productId={item.id} // VIDEO ADD: THIS IS THE ONLY CHANGE
                                src={displayImageUrl}
                                allImages={item.image_urls || (item.image_url? [item.image_url] : [])}
                                alt={item.name}
                                useAiEnhanced={item.use_ai_enhanced}
                                hasAiImage={!!item.image_url_ai_enhanced}
                              />
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-slate-900 text-sm">{item.name}</span>
                                  {item.image_urls && item.image_urls.length > 1 && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                                      {item.image_urls.length} images
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-700 font-mono">Barcode ID: {item.barcode || 'N/A'}</div>
                              </div>
                            </div>

                            <form action={deleteProduct}>
                              <input type="hidden" name="id" value={item.id} />
                              <button
                                type="submit"
                                className="text-slate-600 hover:text-rose-600 text-xs font-bold transition"
                              >
                                🗑️ Delete
                              </button>
                            </form>
                          </div>

                          <div> {/* VIDEO ADD */}
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Add More Videos</label> {/* VIDEO ADD */}
                            <input type="file" multiple accept="video/*" onChange={(e) => handleVideoUpload(e, item.id)} className="w-full text-xs p-1 border rounded" /> {/* VIDEO ADD */}
                            {uploadingVideos[item.id] && <p className="text-xs text-blue-600">Uploading...</p>} {/* VIDEO ADD */}
                          </div> {/* VIDEO ADD */}

                          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 pt-2 border-t border-slate-100 text-xs">
                            <div className="space-y-1">
                              <span className="text-slate-700 font-bold block uppercase tracking-wider">Cost Price ({symbol})</span>
                              <form action={updatePrice} className="flex items-center space-x-1">
                                <input type="hidden" name="id" value={item.id} />
                                <input type="hidden" name="field" value="cost_price" />
                                <input
                                  type="number"
                                  name="newPrice"
                                  defaultValue={Number(item.cost_price)}
                                  step="any"
                                  className="w-20 p-1 border rounded bg-white text-slate-900 font-mono text-center outline-none"
                                />
                                <button type="submit" className="text-blue-600 font-bold hover:underline">Save</button>
                              </form>
                            </div>

                            <div className="space-y-1">
                              <span className="text-slate-700 font-bold block uppercase tracking-wider">Retail Price ({symbol})</span>
                              <form action={updatePrice} className="flex items-center space-x-1">
                                <input type="hidden" name="id" value={item.id} />
                                <input type="hidden" name="field" value="retail_price" />
                                <input
                                  type="number"
                                  name="newPrice"
                                  defaultValue={Number(item.retail_price)}
                                  step="any"
                                  className="w-20 p-1 border rounded bg-white text-slate-900 font-mono text-center outline-none"
                                />
                                <button type="submit" className="text-blue-600 font-bold hover:underline">Save</button>
                              </form>
                            </div>

                            <div className="space-y-1">
                              <span className="text-slate-700 font-bold block uppercase tracking-wider">Available Units</span>
                              <span className={`font-mono font-bold block text-sm ${item.stock_quantity <= (item.low_stock_threshold || 5)? 'text-amber-700' : 'text-slate-900'}`}>
                                {item.stock_quantity} remaining
                              </span>
                            </div>

                            <div className="space-y-1">
                              <span className="text-slate-700 font-bold block uppercase tracking-wider">Quick Adjust</span>
                              <div className="flex space-x-1">
                                <form action={updateStock}>
                                  <input type="hidden" name="id" value={item.id} />
                                  <input type="hidden" name="currentStock" value={item.stock_quantity} />
                                  <input type="hidden" name="adjustment" value="-1" />
                                  <button
                                    type="submit"
                                    className="px-2 py-0.5 border bg-white hover:bg-slate-100 rounded text-slate-800 font-bold transition"
                                  >
                                    -1
                                  </button>
                                </form>
                                <form action={updateStock}>
                                  <input type="hidden" name="id" value={item.id} />
                                  <input type="hidden" name="currentStock" value={item.stock_quantity} />
                                  <input type="hidden" name="adjustment" value="1" />
                                  <button
                                    type="submit"
                                    className="px-2 py-0.5 border bg-white hover:bg-slate-100 rounded text-slate-800 font-bold transition"
                                  >
                                    +1
                                  </button>
                                </form>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <span className="text-slate-700 font-bold block uppercase tracking-wider">Bulk Add Stock</span>
                              <form onSubmit={(e) => handleBulkStockSubmit(e, item.id, item.stock_quantity)} className="flex items-center space-x-1">
                                <input
                                  type="number"
                                  value={bulkStockValue[item.id] || ''}
                                  onChange={(e) => setBulkStockValue(prev => ({...prev, [item.id]: e.target.value}))}
                                  placeholder="100"
                                  className="w-16 p-1 border rounded bg-white text-slate-900 font-mono text-center outline-none"
                                />
                                <button type="submit" className="text-green-600 font-bold hover:underline">Add</button>
                              </form>
                            </div>

                            <div className="space-y-1">
                              <span className="text-slate-700 font-bold block uppercase tracking-wider">Barcode PDF Qty</span>
                              <form action={updateBarcodeQty} className="flex items-center space-x-1">
                                <input type="hidden" name="id" value={item.id} />
                                <input
                                  type="number"
                                  name="qty"
                                  defaultValue={item.barcode_print_qty || 1}
                                  min="1"
                                  className="w-16 p-1 border rounded bg-white text-slate-900 font-mono text-center outline-none"
                                />
                                <button type="submit" className="text-blue-600 font-bold hover:underline">Set</button>
                              </form>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
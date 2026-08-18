'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/app/utils/supabase/client'
import { BrowserMultiFormatReader } from '@zxing/library'
import jsPDF from 'jspdf'
import { Product } from './types'

interface CartItem {
  id: string
  name: string
  retail_price: number
  stock_quantity: number
  cost_price: number
  quantity: number
}

interface CheckoutPanelProps {
  products: Product[]
  shopId?: string
  slug: string
  cashierId: string
  cashierName: string
}

type BarcodeSize = 'small' | 'medium' | 'large'

export default function CheckoutPanel({
  products,
  shopId: propShopId,
  slug,
  cashierId,
  cashierName
}: CheckoutPanelProps) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [cashTendered, setCashTendered] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [isScanning, setIsScanning] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([])
  const [barcodeSize, setBarcodeSize] = useState<BarcodeSize>('medium')
  const [shopId, setShopId] = useState<string | null>(propShopId || null)
  const [shopDetails, setShopDetails] = useState<{name: string, address: string, phone: string, logo_url: string} | null>(null)
  
  // ADDED FOR POS CUSTOMER INFO
  const [customerName, setCustomerName] = useState<string>('Walk-in Customer')
  const [customerPhone, setCustomerPhone] = useState<string>('')

  const searchInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const supabase = createClient()
  const codeReader = useRef(new BrowserMultiFormatReader())

  useEffect(() => {
    const getShopData = async () => {
      try {
        let currentShopId = propShopId

        if (!currentShopId) {
          const { data } = await supabase.auth.getUser() // FIXED: no nested destructuring
          const user = data.user
          if (user) {
            const { data: profile } = await supabase
           .from('user_profiles')
           .select('shop_id')
           .eq('id', user.id)
           .maybeSingle()

            currentShopId = profile?.shop_id
            if (currentShopId) setShopId(currentShopId)
          }
        }

        if (currentShopId) {
          const { data: shop } = await supabase
         .from('shops')
         .select('name, address, phone, logo_url')
         .eq('id', currentShopId)
         .maybeSingle()
          if (shop) setShopDetails(shop)
        }
      } catch (e) {
        console.error("Shop load error:", e)
      }
    }
    getShopData()
  }, [propShopId, supabase])

  const addToCart = useCallback((product: Product) => {
    if (product.stock_quantity <= 0) {
      alert(`${product.name} is currently out of stock!`)
      return
    }

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id)
      if (existingItem) {
        if (existingItem.quantity >= product.stock_quantity) {
          alert(`Cannot add more. Max warehouse stock count is ${product.stock_quantity}.`)
          return prevCart
        }
        return prevCart.map((item) =>
          item.id === product.id? {...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prevCart, {
        id: product.id,
        name: product.name,
        retail_price: product.retail_price,
        stock_quantity: product.stock_quantity,
        cost_price: product.cost_price,
        quantity: 1
      }]
    })
  }, [])

  const handleBarcodeScan = useCallback((scannedCode: string) => {
    const product = products.find(p => p.barcode === scannedCode.trim())
    if (product) {
      addToCart(product)
      if (searchInputRef.current) {
        searchInputRef.current.classList.add('ring-2', 'ring-emerald-500')
        setTimeout(() => {
          searchInputRef.current?.classList.remove('ring-2', 'ring-emerald-500')
        }, 300)
      }
    } else {
      alert(`Product not found for barcode: ${scannedCode}`)
    }
  }, [products, addToCart])

  useEffect(() => {
    let barcodeBuffer = ''
    let lastKeyTime = Date.now()

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now()
      if (currentTime - lastKeyTime > 50) barcodeBuffer = ''
      lastKeyTime = currentTime

      if (e.key === 'Enter') {
        if (barcodeBuffer.length >= 8) {
          e.preventDefault()
          handleBarcodeScan(barcodeBuffer)
          barcodeBuffer = ''
          setSearchTerm('')
        }
        return
      }
      if (e.key.length === 1) barcodeBuffer += e.key
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleBarcodeScan])

  const startCameraScan = async () => {
    setIsScanning(true)

    if (location.protocol!== 'https:' && location.hostname!== 'localhost') {
      alert('Camera needs HTTPS. Deploy to Vercel or use https://localhost')
      setIsScanning(false)
      return
    }

    try {
      const videoInputDevices = await codeReader.current.listVideoInputDevices()
      if (videoInputDevices.length === 0) {
        alert('No camera found. Close WhatsApp/Zoom if they are using camera')
        setIsScanning(false)
        return
      }

      const selectedDeviceId = videoInputDevices[0]?.deviceId

      await codeReader.current.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current!,
        (result) => {
          if (result) {
            handleBarcodeScan(result.getText())
            stopCameraScan()
          }
        }
      )
    } catch (err: any) {
      console.error(err)
      alert('Camera error: ' + err.message)
      setIsScanning(false)
    }
  }

  const stopCameraScan = () => {
    codeReader.current.reset()
    setIsScanning(false)
  }

  const generateBarcodePDF = () => {
    const productsToPrint = selectedProducts.length > 0? selectedProducts : products.filter(p => p.barcode)

    if (productsToPrint.length === 0) {
      alert('No products with barcodes selected')
      return
    }

    const doc = new jsPDF()
    const pageWidth = 210
    const pageHeight = 297

    const sizeConfig = {
      small: { cols: 5, rows: 13, h: 15, font: 6 },
      medium: { cols: 4, rows: 10, h: 20, font: 8 },
      large: { cols: 3, rows: 8, h: 25, font: 10 }
    }

    const config = sizeConfig[barcodeSize]
    const cellW = pageWidth / config.cols
    const cellH = pageHeight / config.rows

    productsToPrint.forEach((product, idx) => {
      if (idx % (config.cols * config.rows) === 0 && idx!== 0) doc.addPage()

      const posOnPage = idx % (config.cols * config.rows)
      const row = Math.floor(posOnPage / config.cols)
      const col = posOnPage % config.cols

      const x = col * cellW + 2
      const y = row * cellH + 2

      doc.rect(x, y, cellW - 4, cellH - 4)
      doc.setFontSize(config.font)
      doc.text(product.name.substring(0, 20), x + 2, y + 5, { maxWidth: cellW - 8 })
      doc.setFont('courier', 'normal')
      doc.setFontSize(config.font + 2)
      doc.text(`*${product.barcode}*`, x + 2, y + cellH - 8, { maxWidth: cellW - 8 })
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(config.font)
      doc.text(`UGX ${product.retail_price.toLocaleString()}`, x + 2, y + cellH - 4)
    })

    doc.save(`barcodes-${barcodeSize}-${Date.now()}.pdf`)
  }

  const toggleProductForPrint = (product: Product) => {
    setSelectedProducts(prev =>
      prev.find(p => p.id === product.id)
? prev.filter(p => p.id!== product.id)
        : [...prev, product]
    )
  }

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.barcode && product.barcode.includes(searchTerm))
  )

  const updateQuantity = (id: string, amount: number) => {
    setCart((prevCart) =>
      prevCart
.map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + amount
            if (newQty > item.stock_quantity) {
              alert(`Cannot exceed available stock of ${item.stock_quantity}.`)
              return item
            }
            return {...item, quantity: newQty }
          }
          return item
        })
.filter((item) => item.quantity > 0)
    )
  }

  const removeFromCart = (id: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id!== id))
  }

  const clearCart = () => {
    setCart([])
    setCashTendered('')
    setCustomerName('Walk-in Customer') // RESET
    setCustomerPhone('') // RESET
  }

  const totalAmount = cart.reduce((sum, item) => sum + item.retail_price * item.quantity, 0)
  const cashAmount = parseFloat(cashTendered) || 0
  const changeDue = cashAmount > totalAmount? cashAmount - totalAmount : 0

  // AUTO PRINT - HIDDEN WINDOW
  const printThermalReceipt = (orderNumber: string) => {
    try {
      const receiptWindow = window.open('', '_blank', 'width=1,height=1,left=-10000,top=-10000')
      if (!receiptWindow) return

      const receiptHTML = `
        <html>
          <head>
            <title>Receipt ${orderNumber}</title>
            <style>
              @media print { @page { size: 80mm auto; margin: 0; } body { width: 72mm; } }
              body { font-family: 'Courier New', monospace; padding: 4px; width: 72mm; margin: 0; font-size: 11px; line-height: 1.2; }
            .center { text-align: center; }.bold { font-weight: bold; font-size: 12px; }.line { border-top: 1px dashed #000; margin: 4px 0; }
            .row { display: flex; justify-content: space-between; }
            </style>
          </head>
          <body onload="window.print(); setTimeout(() => window.close(), 800)">
            <div class="center">
              ${shopDetails?.logo_url? `<img src="${shopDetails.logo_url}" style="max-height:40px;" onerror="this.style.display='none'" />` : ''}
              <div class="bold">${shopDetails?.name || 'SHOPAI POS'}</div>
              <div>${shopDetails?.address || ''}</div>
              <div>${shopDetails?.phone? `Tel: ${shopDetails.phone}` : ''}</div>
              <div>Cashier: ${cashierName}</div>
              <div>Customer: ${customerName}</div>
            </div>
            <div class="line"></div>
            <div class="row"><span>Receipt:</span><span class="bold">#${orderNumber}</span></div>
            <div class="row"><span>Date:</span><span>${new Date().toLocaleString()}</span></div>
            <div class="line"></div>
            ${cart.map(item => `
              <div>${item.name.substring(0, 24)}</div>
              <div class="row"><span>${item.quantity} x ${item.retail_price.toLocaleString()}</span><span>${(item.retail_price * item.quantity).toLocaleString()}</span></div>
            `).join('')}
            <div class="line"></div>
            <div class="row bold"><span>TOTAL:</span><span>UGX ${totalAmount.toLocaleString()}</span></div>
            <div class="row"><span>CASH:</span><span>UGX ${cashAmount.toLocaleString()}</span></div>
            <div class="row bold"><span>CHANGE:</span><span>UGX ${changeDue.toLocaleString()}</span></div>
            <div class="line"></div>
            <div class="center">Thank you for shopping with us!</div>
          </body>
        </html>
      `
      receiptWindow.document.write(receiptHTML)
      receiptWindow.document.close()
    } catch (e) {
      console.error("Print failed:", e)
    }
  }

  const handleCheckout = async () => {
    if (!shopId) return alert("Shop not loaded")
    if (cart.length === 0) return alert("Cart is empty")
    if (cashAmount < totalAmount) return alert("Insufficient cash")

    // FIXED: Get user without nested destructuring
    const { data } = await supabase.auth.getUser()
    const user = data.user
    if (!user) return alert("Cashier not logged in")

    try {
      const { data, error } = await supabase.rpc('create_pos_order', {
        p_items: cart.map(item => ({
          id: item.id, // ADDED THIS - REQUIRED FOR STOCK UPDATE
          name: item.name,
          qty: item.quantity,
          price: item.retail_price,
          total: item.retail_price * item.quantity
        })),
        p_payment_method: 'cash',
        p_cashier_id: cashierId,
        p_cashier_name: cashierName,
        p_cash_received: cashAmount,
        p_shop_id: shopId,
        p_delivery_fee: 0,
        p_customer_lat: null,
        p_customer_lng: null,
        p_google_maps_link: null,
        p_fulfillment_type: 'pos',
        
        // ADDED THESE 3 TO FIX "Missing required fields"
        p_user_id: user.id,
        p_customer_name: customerName,
        p_customer_phone: customerPhone,
        p_customer_whatsapp: customerPhone
      })

      if (error) throw error

      printThermalReceipt(data.order_number) // AUTO PRINT

      // SALE COMPLETE ALERT
      alert(`Sale Complete!
Order: ${data.order_number}
Total: UGX ${totalAmount.toLocaleString()}
Change: UGX ${changeDue.toLocaleString()}`)

      clearCart() // INSTANT CLEAR

    } catch (err: any) {
      console.error('RPC Error:', err)
      alert(`Transaction failed: ${err.message}`)
    }
  }

  return (
    <div className="w-full">
      <p className="text-sm text-gray-600 mb-4">Initiate physical orders directly with real-time sync across Uganda's branches.</p>

      <div className="w-full bg-white rounded-xl shadow-lg border-gray-200 p-5 text-black">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Live POS Terminal</h2>
          <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-semibold">
            {cashierName}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 flex-col gap-3">
            <div className="flex gap-2">
              <button
                onClick={startCameraScan}
                className="flex-1 bg-blue-600 text-white px-3 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700"
              >
                📷 Scan with Camera
              </button>
              <select
                value={barcodeSize}
                onChange={(e) => setBarcodeSize(e.target.value as BarcodeSize)}
                className="border border-gray-300 rounded-lg px-3 text-sm bg-white"
              >
                <option value="small">Small Labels</option>
                <option value="medium">Medium Labels</option>
                <option value="large">Large Labels</option>
              </select>
              <button
                onClick={generateBarcodePDF}
                className="bg-gray-800 text-white px-3 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-900"
              >
                📄 PDF ({selectedProducts.length || 'All'})
              </button>
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Scan barcode or search product..."
                className="w-full pl-9 pr-3 py-2.5 border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-3 gap-3 max-h-[480px] overflow-y-auto pr-1">
              {filteredProducts.length === 0? (
                <p className="col-span-3 text-center text-gray-400 text-sm py-8">No products found.</p>
              ) : (
                filteredProducts.map((product) => (
                  <div key={product.id} className="relative bg-white border-gray-200 rounded-lg p-3">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-gray-800 text-sm">{product.name}</h4>
                        {product.barcode && (
                          <input
                            type="checkbox"
                            checked={selectedProducts.some(p => p.id === product.id)}
                            onChange={() => toggleProductForPrint(product)}
                            className="w-4 h-4"
                          />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Stock: {product.stock_quantity}</p>
                    </div>
                    <div className="mt-3 flex w-full justify-between items-center">
                      <span className="text-sm font-bold text-blue-600">UGX {product.retail_price.toLocaleString()}</span>
                      <button
                        onClick={() => addToCart(product)}
                        disabled={product.stock_quantity === 0}
                        className="text-xs bg-gray-100 px-2.5 py-1 rounded hover:bg-blue-500 hover:text-white disabled:opacity-50"
                      >
                        Add +
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border-gray-200 rounded-xl p-4">
            <div className="flex justify-between items-center border-b pb-2 mb-3">
              <h3 className="font-bold text-gray-800">Active Bill</h3>
              <button onClick={clearCart} className="text-xs text-red-500 hover:underline font-semibold">Clear</button>
            </div>

            {/* ADDED: Customer inputs */}
            <div className="mb-3">
              <input
                type="text"
                placeholder="Customer Name"
                className="w-full p-2 border-gray-300 rounded bg-white text-sm mb-2"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <input
                type="text"
                placeholder="Customer Phone"
                className="w-full p-2 border-gray-300 rounded bg-white text-sm"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto mb-4">
              {cart.length === 0? (
                <div className="text-center py-12 text-gray-400 text-sm">Cart is empty</div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border text-xs">
                    <div className="flex-1 min-w-0 pr-2">
                      <h5 className="font-semibold text-gray-800 truncate">{item.name}</h5>
                      <p className="text-gray-500">UGX {item.retail_price.toLocaleString()} x {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => updateQuantity(item.id, -1)} className="w-5 h-5 rounded bg-white border font-bold">-</button>
                      <button onClick={() => updateQuantity(item.id, 1)} className="w-5 h-5 rounded bg-white border font-bold">+</button>
                    </div>
                    <p className="font-bold text-gray-700 ml-2">UGX {(item.retail_price * item.quantity).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>

            <div className="border-t pt-3">
              <div className="flex justify-between text-sm font-bold text-gray-800 mb-2">
                <span>Total</span>
                <span className="text-blue-600">UGX {totalAmount.toLocaleString()}</span>
              </div>

              <input
                type="number"
                placeholder="Cash Given UGX"
                className="w-full p-2 border-gray-300 rounded bg-white text-sm mb-2"
                value={cashTendered}
                onChange={(e) => setCashTendered(e.target.value)}
              />

              <div className="flex justify-between text-sm font-semibold text-gray-700 bg-gray-100 p-2 rounded mb-3">
                <span>Change:</span>
                <span className="font-bold text-emerald-600">UGX {changeDue.toLocaleString()}</span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || cashAmount < totalAmount ||!shopId}
                className={`w-full py-3 rounded-lg text-white font-bold text-sm ${
                  cart.length === 0 || cashAmount < totalAmount ||!shopId? 'bg-gray-300' : 'bg-emerald-500 hover:bg-emerald-600'
                }`}
              >
                Complete Sale
              </button>
            </div>
          </div>
        </div>
      </div>

      {isScanning && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-4 max-w-md w-full mx-4">
            <h3 className="font-bold mb-2">Scan Barcode</h3>
            <video ref={videoRef} className="w-full rounded" />
            <button onClick={stopCameraScan} className="mt-3 w-full bg-red-500 text-white py-2 rounded">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
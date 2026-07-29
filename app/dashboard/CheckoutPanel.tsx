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
  const [isProcessing, setIsProcessing] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([])
  const [barcodeSize, setBarcodeSize] = useState<BarcodeSize>('medium')
  const [shopId, setShopId] = useState<string | null>(propShopId || null)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const supabase = createClient()
  const codeReader = useRef(new BrowserMultiFormatReader())

  useEffect(() => {
    const getShopId = async () => {
      if (propShopId) return 

      const { data } = await supabase.auth.getUser() 
      const user = data.user 
      
      if (user) {
        const { data: profile } = await supabase
         .from('user_profiles')
         .select('shop_id')
         .eq('id', user.id)
         .single()

        if (profile?.shop_id) setShopId(profile.shop_id)
      }
    }
    getShopId()
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
          item.id === product.id ? {...item, quantity: item.quantity + 1 } : item
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

    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
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
      if (err.name === 'NotAllowedError') {
        alert('Camera BLOCKED.\n\nFix: Click 🔒 icon in address bar → Camera → Allow → Reload page')
      } else if (err.name === 'NotFoundError') {
        alert('No camera found on this device')
      } else if (err.name === 'NotReadableError') {
        alert('Camera is busy. Close other apps using it like Zoom/WhatsApp')
      } else if (err.name === 'OverconstrainedError') {
        alert('Camera does not meet requirements. Try a different device')
      } else {
        alert('Camera error: ' + err.message)
      }
      setIsScanning(false)
    }
  }

  const stopCameraScan = () => {
    codeReader.current.reset()
    setIsScanning(false)
  }

  const generateBarcodePDF = () => {
    const productsToPrint = selectedProducts.length > 0 ? selectedProducts : products.filter(p => p.barcode)

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
      if (idx % (config.cols * config.rows) === 0 && idx !== 0) doc.addPage()

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
       ? prev.filter(p => p.id !== product.id)
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
    setCart((prevCart) => prevCart.filter((item) => item.id !== id))
  }

  const clearCart = () => {
    setCart([])
    setCashTendered('')
  }

  const totalAmount = cart.reduce((sum, item) => sum + item.retail_price * item.quantity, 0)
  const cashAmount = parseFloat(cashTendered) || 0
  const changeDue = cashAmount > totalAmount ? cashAmount - totalAmount : 0

  const handleCheckout = async () => {
    if (!shopId) {
      alert("Error: Shop not loaded yet. Please wait a second and try again.")
      return
    }
    if (cart.length === 0) {
      alert("Your register terminal cart is completely empty!")
      return
    }
    if (cashAmount < totalAmount) {
      alert("Insufficient cash provided to cover transaction costs!")
      return
    }

    setIsProcessing(true)
    try {
      const { data, error } = await supabase.rpc('create_pos_order', {
        p_items: cart.map(item => ({
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.retail_price,
          cost_price: item.cost_price
        })),
        p_payment_method: 'cash',
        p_cashier_id: cashierId,
        p_cashier_name: cashierName,
        p_cash_received: cashAmount,
        p_shop_id: shopId,
        p_tax_amount: 0,
        p_customer_lat: null,
        p_customer_lng: null,
        p_google_maps_link: null,
        p_fulfillment_type: 'pickup'
      })

      if (error) throw error

      alert(`Sale Processed! Order: ${data.order_number}. Total: UGX ${totalAmount.toLocaleString()}. Change: UGX ${changeDue.toLocaleString()}`)
      clearCart()

    } catch (err: any) {
      console.error('RPC Error:', err)
      alert(`Transaction failed: ${err.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="w-full bg-white rounded-xl shadow-md border-gray-100 p-6 my-6 grid grid-cols-1 lg:grid-cols-3 gap-6 text-black">

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

      <div className="lg:col-span-2 flex-col gap-4">
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-xl font-bold tracking-tight text-gray-800">Live POS Terminal</h2>
          <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-semibold">
            {cashierName}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={startCameraScan}
            className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
          >
            📷 Scan with Camera
          </button>
          <select
            value={barcodeSize}
            onChange={(e) => setBarcodeSize(e.target.value as BarcodeSize)}
            className="border rounded-lg px-2 text-sm"
          >
            <option value="small">Small Labels</option>
            <option value="medium">Medium Labels</option>
            <option value="large">Large Labels</option>
          </select>
          <button
            onClick={generateBarcodePDF}
            className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-gray-900"
          >
            📄 PDF ({selectedProducts.length || 'All'})
          </button>
        </div>

        <input
          ref={searchInputRef}
          type="text"
          placeholder="🔍 Scan barcode or search product..."
          className="w-full p-2.5 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoFocus
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-1">
          {filteredProducts.length === 0 ? (
            <p className="col-span-full text-center text-gray-400 text-sm py-8">No products found.</p>
          ) : (
            filteredProducts.map((product) => (
              <div key={product.id} className="relative">
                <button
                  onClick={() => addToCart(product)}
                  disabled={product.stock_quantity === 0}
                  className="w-full flex flex-col justify-between text-left p-3 border rounded-xl hover:border-blue-500 hover:bg-blue-50/30 transition group relative disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div>
                    <h4 className="font-semibold text-gray-800 text-sm line-clamp-2">{product.name}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">Stock: {product.stock_quantity}</p>
                    {product.barcode && <p className="text-[9px] text-gray-400 font-mono">{product.barcode}</p>}
                  </div>
                  <div className="mt-3 flex w-full justify-between items-end">
                    <span className="text-xs font-bold text-blue-600">UGX {product.retail_price.toLocaleString()}</span>
                    <span className="text- bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 group-hover:bg-blue-500 group-hover:text-white transition">
                      {product.stock_quantity === 0 ? 'Out' : 'Add +'}
                    </span>
                  </div>
                </button>
                {product.barcode && (
                  <input
                    type="checkbox"
                    checked={selectedProducts.some(p => p.id === product.id)}
                    onChange={() => toggleProductForPrint(product)}
                    className="absolute top-1 right-1 w-4 h-4"
                    title="Add to PDF"
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-gray-50 border rounded-xl p-4 flex flex-col justify-between min-h-[450px]">
        <div>
          <div className="flex justify-between items-center border-b pb-2 mb-3">
            <h3 className="font-bold text-gray-700">Active Bill</h3>
            <button onClick={clearCart} className="text-xs text-red-500 hover:underline">Clear Items</button>
          </div>

          <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto mb-4 pr-1">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">Cart is empty.<br/>Select products to build invoice.</div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center bg-white p-2 rounded-lg border text-xs shadow-sm">
                  <div className="flex-1 min-w-0 pr-2">
                    <h5 className="font-semibold text-gray-800 truncate">{item.name}</h5>
                    <p className="text- text-gray-400">UGX {item.retail_price.toLocaleString()} each</p>
                  </div>
                  <div className="flex items-center gap-1.5 mr-3">
                    <button onClick={() => updateQuantity(item.id, -1)} className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center font-bold hover:bg-gray-200">-</button>
                    <span className="font-bold w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center font-bold hover:bg-gray-200">+</button>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-700">UGX {(item.retail_price * item.quantity).toLocaleString()}</p>
                    <button onClick={() => removeFromCart(item.id)} className="text-[9px] text-red-400 hover:text-red-600">Remove</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border-t pt-3 flex-col gap-2">
          <div className="flex justify-between text-sm font-bold text-gray-800 border-b pb-2 mb-2">
            <span>Grand Total</span>
            <span className="text-blue-600">UGX {totalAmount.toLocaleString()}</span>
          </div>

          <div className="flex flex-col gap-1 mb-3">
            <label className="text- uppercase font-bold text-gray-400 tracking-wider">Cash Given (UGX)</label>
            <input
              type="number"
              placeholder="Enter amount given"
              className="w-full p-2 border rounded bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono font-bold"
              value={cashTendered}
              onChange={(e) => setCashTendered(e.target.value)}
            />
          </div>

          <div className="flex justify-between text-xs font-semibold text-gray-700 bg-gray-100 p-2 rounded mb-3">
            <span>Balance Change Due:</span>
            <span className="font-mono font-bold text-emerald-600">UGX {changeDue.toLocaleString()}</span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isProcessing || cashAmount < totalAmount || !shopId}
            className={`w-full py-3 rounded-lg text-white font-bold text-sm shadow transition tracking-wide ${
              cart.length === 0 || isProcessing || cashAmount < totalAmount || !shopId ? 'bg-gray-300 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600'
            }`}
          >
            {isProcessing ? 'Processing...' : !shopId ? 'Loading shop...' : 'Complete Sale & Log Transaction'}
          </button>
        </div>
      </div>
    </div>
  )
}
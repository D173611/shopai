'use client'
import { useState, useEffect, useRef } from 'react'
import ProductImage from '../../dashboard/ProductImage'

type PaymentMethod = { name: string, details: string }
type Shop = {
  id: string
  name: string
  description: string | null
  logo_url: string | null
  primary_color: string | null
  slug: string
  wallpaper_url?: string | null
  location?: string | null
  latitude?: number | null // REAL SHOP LAT FROM DB / SETTINGS
  longitude?: number | null // REAL SHOP LNG FROM DB / SETTINGS
  phone?: string | null
  whatsapp?: string | null
  payment_info?: string | null
  payment_methods?: PaymentMethod[] | null
  price_per_km?: number | null
}

type Product = {
  id: string
  name: string
  retail_price: number | null
  image_url: string | null
  image_urls: string[] | null
  description: string | null
  ai_enhanced_image_url: string | null
  has_ai_image: boolean
}

type CartItem = Product & { qty: number }

type ShopClientProps = {
  shop: Shop
  products: Product[]
  pricePerKm: number
}

const DEFAULT_STORE_LAT = 0.3476; // KAMPALA FALLBACK
const DEFAULT_STORE_LNG = 32.5825; // KAMPALA FALLBACK
const DEFAULT_PRICE_PER_KM = 1500;

export default function ShopClient({ shop, products, pricePerKm }: ShopClientProps) {
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCheckout, setShowCheckout] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [otherPaymentMethod, setOtherPaymentMethod] = useState('')
  const [showMap, setShowMap] = useState(false)

  // SAFE COORDINATES RESOLUTION (Prioritizes DB settings passed onto shop object)
  const STORE_LAT = shop.latitude ?? DEFAULT_STORE_LAT;
  const STORE_LNG = shop.longitude ?? DEFAULT_STORE_LNG;

  const PRICE_PER_KM = pricePerKm || shop.price_per_km || DEFAULT_PRICE_PER_KM;

  const [isPickup, setIsPickup] = useState(false)
  const [customerLat, setCustomerLat] = useState<number | null>(null)
  const [customerLng, setCustomerLng] = useState<number | null>(null)
  const [distanceKm, setDistanceKm] = useState(0)
  const [deliveryFee, setDeliveryFee] = useState(0)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)

  const [locationSearch, setLocationSearch] = useState('')
  const [searching, setSearching] = useState(false)

  const [orderForm, setOrderForm] = useState({
    name: '',
    phone: '',
    location: '',
    payment_method: '',
    transaction_id: ''
  })

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2500)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // LOAD LEAFLET
  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script')
      script.id = 'leaflet-js'
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      document.body.appendChild(script)
    }
  }, [])

  // INIT MAP - CLEANED UP RE-RENDER LOGIC TO PREVENT BREAKS
  useEffect(() => {
    if (showMap && mapRef.current && (window as any).L) {
      const L = (window as any).L

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapRef.current).setView([STORE_LAT, STORE_LNG], 13)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstanceRef.current)
        L.marker([STORE_LAT, STORE_LNG]).addTo(mapInstanceRef.current).bindPopup(`🏪 ${shop.name}`)

        markerRef.current = L.marker([STORE_LAT, STORE_LNG], {draggable: true}).addTo(mapInstanceRef.current).bindPopup("📍 Drag me to your location")

        markerRef.current.on('dragend', () => {
          const pos = markerRef.current.getLatLng()
          setCustomerLat(pos.lat)
          setCustomerLng(pos.lng)
          const dist = getDistance(STORE_LAT, STORE_LNG, pos.lat, pos.lng)
          setDistanceKm(dist)
          setDeliveryFee(Math.round(dist * PRICE_PER_KM))
          setOrderForm(prev => ({...prev, location: `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`}))
        })
      } else {
        // Update view if store coords change dynamically
        mapInstanceRef.current.setView([STORE_LAT, STORE_LNG], 13)
      }
    }
  }, [showMap, STORE_LAT, STORE_LNG, shop.name, PRICE_PER_KM])

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2-lat1) * Math.PI / 180;
    const dLon = (lon2-lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  const geocodeLocation = async (query: string) => {
    if(!query.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
      const data = await res.json()

      if(data.length > 0) {
        const lat = parseFloat(data[0].lat)
        const lng = parseFloat(data[0].lon)
        setCustomerLat(lat)
        setCustomerLng(lng)
        setOrderForm(prev => ({...prev, location: data[0].display_name}))

        const dist = getDistance(STORE_LAT, STORE_LNG, lat, lng)
        setDistanceKm(dist)
        setDeliveryFee(Math.round(dist * PRICE_PER_KM))

        if(markerRef.current && mapInstanceRef.current) {
          markerRef.current.setLatLng([lat, lng])
          mapInstanceRef.current.setView([lat, lng], 16)
        }
        setToast(`Location found`)
      } else {
        alert(`Location not found. Try entering a nearby landmark or coordinates like ${STORE_LAT}, ${STORE_LNG}`)
      }
    } catch(e) {
      console.error(e)
      alert('Search failed')
    }
    setSearching(false)
  }

  const handleCoordsPaste = (val: string) => {
    const parts = val.split(',')
    if(parts.length === 2) {
      const lat = parseFloat(parts[0].trim())
      const lng = parseFloat(parts[1].trim())
      if(!isNaN(lat) && !isNaN(lng)) {
        setCustomerLat(lat)
        setCustomerLng(lng)
        setOrderForm(prev => ({...prev, location: `${lat}, ${lng}`}))
        const dist = getDistance(STORE_LAT, STORE_LNG, lat, lng)
        setDistanceKm(dist)
        setDeliveryFee(Math.round(dist * PRICE_PER_KM))
        if(markerRef.current && mapInstanceRef.current) {
          markerRef.current.setLatLng([lat, lng])
          mapInstanceRef.current.setView([lat, lng], 16)
        }
      }
    }
  }

  const handlePickupToggle = (val: boolean) => {
    setIsPickup(val)
    if(val) {
      setCustomerLat(null)
      setCustomerLng(null)
      setDistanceKm(0)
      setDeliveryFee(0)
      setShowMap(false)
      setLocationSearch('')
    }
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const addToCart = (product: Product) => {
    setCart(prev => {
      const exists = prev.find(p => p.id === product.id)
      setToast(`${product.name} added!`)
      if (exists) {
        return prev.map(p => p.id === product.id ? {...p, qty: p.qty + 1 } : p)
      }
      return [...prev, {...product, qty: 1 }]
    })
  }

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(p => p.id !== id))
  }

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) return removeFromCart(id)
    setCart(prev => prev.map(p => p.id === id ? {...p, qty } : p))
  }

  const itemsTotal = cart.reduce((sum, item) => sum + (item.retail_price || 0) * item.qty, 0)
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0)
  const grandTotal = itemsTotal + deliveryFee

  const validateAndConfirm = () => {
    const finalPaymentMethod = orderForm.payment_method === 'Other' ? otherPaymentMethod : orderForm.payment_method

    if (!orderForm.name || !orderForm.phone) {
      alert('Please fill name and phone/whatsapp')
      return
    }
    if(!isPickup && !finalPaymentMethod) {
      alert('Please select payment method')
      return
    }
    if(!isPickup && !customerLat) {
      alert('Please search location or set pin on map')
      return
    }
    setShowConfirm(true)
  }

  const handleOrder = async () => {
    setSubmitting(true)
    const finalPaymentMethod = orderForm.payment_method === 'Other' ? otherPaymentMethod : orderForm.payment_method
    const googleMapsLink = customerLat ? `https://www.google.com/maps?q=${customerLat},${customerLng}` : null

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shop_id: shop.id,
        name: orderForm.name,
        phone: orderForm.phone,
        location: orderForm.location,
        payment_method: finalPaymentMethod,
        transaction_id: orderForm.transaction_id,
        items: cart.map(i => ({
          id: i.id,
          name: i.name,
          price: i.retail_price || 0,
          qty: i.qty,
          image_url: i.ai_enhanced_image_url || i.image_url
        })),
        total: grandTotal,
        items_total: itemsTotal,
        delivery_fee: deliveryFee,
        customer_lat: customerLat,
        customer_lng: customerLng,
        google_maps_link: googleMapsLink,
        fulfillment_type: isPickup ? 'pickup' : 'delivery',
        distance_km: distanceKm,
        price_per_km_used: PRICE_PER_KM
      })
    })

    setSubmitting(false)
    if (res.ok) {
      setToast('Order placed successfully!')
      setCart([])
      setShowCheckout(false)
      setShowConfirm(false)
      setOrderForm({ name: '', phone: '', location: '', payment_method: '', transaction_id: '' })
      setOtherPaymentMethod('')
      setIsPickup(false)
      setCustomerLat(null)
      setCustomerLng(null)
      setDeliveryFee(0)
      setLocationSearch('')
    } else {
      const data = await res.json()
      alert(`Failed to place order: ${data.error || 'Unknown error'}`)
    }
  }

  return (
    <div className="relative min-h-screen w-full">
      {shop.wallpaper_url && (
        <div
          className="fixed inset-0 w-full h-full bg-cover bg-center bg-no-repeat -z-10"
          style={{ backgroundImage: `url(${shop.wallpaper_url})` }}
        />
      )}

      <div className="relative min-h-screen bg-gradient-to-b from-black/10 via-black/20 to-black/30 p-4 md:p-8">

        {toast && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold animate-bounce">
            {toast}
          </div>
        )}

        <div className="max-w-6xl mx-auto">
          <div className="bg-white/95 shadow-xl rounded-2xl p-4 mb-6 border-white/50">
            <div className="flex items-center gap-4 mb-3">
              {shop.logo_url && <img src={shop.logo_url} className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 shadow-md" alt={shop.name} />}
              <div>
                <h1 className="text-3xl font-bold text-slate-900">{shop.name}</h1>
                {shop.description && <p className="text-slate-600 text-sm mt-1">{shop.description}</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-slate-700 pt-3 border-t border-slate-200">
              {shop.location && <div>📍 {shop.location}</div>}
              {shop.phone && <a href={`tel:${shop.phone}`} className="hover:text-blue-600">📞 {shop.phone}</a>}
              {shop.whatsapp && (
                <a href={`https://wa.me/${shop.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-green-600">
                  💬 WhatsApp
                </a>
              )}
              {shop.payment_info && <div>💳 {shop.payment_info}</div>}
              <div className="text-xs text-gray-500">Delivery: UGX {PRICE_PER_KM.toLocaleString()}/KM</div>
            </div>
          </div>

          {shop.payment_methods && shop.payment_methods.length > 0 && (
            <div className="bg-white/95 shadow-xl rounded-2xl p-4 mb-6 border-white/50">
              <h3 className="font-bold text-slate-900 mb-3 text-base">💳 Payment Methods Accepted</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {shop.payment_methods.map((pm, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-xl border-slate-200">
                    <span className="font-bold text-slate-900 text-sm">{pm.name}</span>
                    <p className="text-slate-700 text-sm mt-1">{pm.details}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full p-3 border-2 border-white/50 rounded-xl mb-6 bg-white/95 shadow-lg outline-none focus:border-blue-500"
          />

          <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
            {filtered.map(product => (
              <div key={product.id} className="mb-4 break-inside-avoid bg-white/95 rounded-xl shadow-xl overflow-hidden flex-col hover:shadow-2xl transition-shadow">
                <div className="relative w-full [&>img]:w-full [&>img]:h-auto [&>img]:block">
                  <ProductImage
                    src={product.ai_enhanced_image_url || product.image_url}
                    allImages={product.image_urls}
                    alt={product.name}
                    useAiEnhanced={!!product.ai_enhanced_image_url}
                    hasAiImage={product.has_ai_image}
                  />
                </div>
                <div className="p-3 flex-col">
                  <h3 className="font-semibold text-sm line-clamp-2 mb-1 text-slate-900">{product.name}</h3>
                  <p className="text-lg font-bold text-slate-900 mb-2">UGX {(product.retail_price || 0).toLocaleString()}</p>
                  <button
                    onClick={() => addToCart(product)}
                    className="w-full bg-white/25 backdrop-blur-xl text-slate-900 border-2 border-white/40 py-2 rounded-lg font-semibold hover:bg-white/40 active:scale-95 transition shadow-lg"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {totalItems > 0 && (
        <button
          onClick={() => setShowCheckout(true)}
          className="fixed bottom-6 right-6 bg-white/30 backdrop-blur-xl text-slate-900 border-2 border-white/50 px-6 py-3 rounded-full font-bold shadow-2xl hover:bg-white/40 active:scale-95 transition z-40"
        >
          🛒 {totalItems} Items - UGX {grandTotal.toLocaleString()}
        </button>
      )}

      {showCheckout && !showConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowCheckout(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Your Order</h2>
              <button onClick={() => setShowCheckout(false)} className="text-2xl hover:bg-slate-100 w-8 h-8 rounded-full">×</button>
            </div>

            <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm">
              <p className="font-bold text-slate-900">{shop.name}</p>
              {shop.location && <p className="text-slate-600">📍 {shop.location}</p>}
              {shop.phone && <p className="text-slate-600">📞 {shop.phone}</p>}
              {shop.whatsapp && <p className="text-slate-600">💬 {shop.whatsapp}</p>}
              {shop.payment_info && <p className="text-slate-600 font-semibold">💳 {shop.payment_info}</p>}
              {shop.payment_methods && shop.payment_methods.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <p className="font-semibold text-slate-900 mb-1">Accepted Payments:</p>
                  {shop.payment_methods.map((pm, idx) => (
                    <p key={idx} className="text-slate-600 text-xs">
                      <span className="font-semibold">{pm.name}:</span> {pm.details}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {cart.map(item => (
                <div key={item.id} className="flex gap-3 items-center border-b pb-3">
                  <div className="w-16 h-16 rounded bg-slate-100 overflow-hidden shrink-0">
                    {item.image_url && <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{item.name}</p>
                    <p className="text-blue-600 font-bold text-sm">UGX {(item.retail_price || 0).toLocaleString()}</p>
                    <p className="text-slate-500 text-xs">Subtotal: UGX {((item.retail_price || 0) * item.qty).toLocaleString()}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-6 h-6 bg-slate-200 rounded hover:bg-slate-300">-</button>
                      <span className="text-sm w-6 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-6 h-6 bg-slate-200 rounded hover:bg-slate-300">+</button>
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-500 text-sm hover:text-red-700">Remove</button>
                </div>
              ))}
            </div>

            <div className="text-xl font-bold mb-4 border-t pt-3">
              <div className="flex justify-between text-sm font-normal">
                <span>Items:</span> <span>UGX {itemsTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-normal">
                <span>Delivery @UGX {PRICE_PER_KM}/KM:</span> <span>UGX {deliveryFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Total:</span> <span>UGX {grandTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-3">
              <input type="text" placeholder="Your Name *" value={orderForm.name} onChange={e => setOrderForm({...orderForm, name: e.target.value })} className="w-full p-3 border rounded-lg" />
              <input type="text" placeholder="Phone *" value={orderForm.phone} onChange={e => setOrderForm({...orderForm, phone: e.target.value })} className="w-full p-3 border rounded-lg" />

              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={isPickup} onChange={e => handlePickupToggle(e.target.checked)} />
                I will pick up the order myself
              </label>

              {!isPickup && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Delivery Location *</label>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type: Ntinda, Kisementi... or paste coords"
                      value={locationSearch}
                      onChange={e => {
                        setLocationSearch(e.target.value)
                        if(e.target.value.includes(',')) handleCoordsPaste(e.target.value)
                      }}
                      className="flex-1 p-3 border rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => geocodeLocation(locationSearch)}
                      disabled={searching}
                      className="bg-blue-600 text-white px-4 rounded-lg font-semibold disabled:bg-gray-400"
                    >
                      {searching ? '...' : 'Find'}
                    </button>
                  </div>

                  <button type="button" onClick={() => setShowMap(!showMap)} className="w-full bg-slate-200 text-slate-900 py-2 rounded-lg text-sm font-semibold">
                    📍 {showMap ? 'Hide Map' : 'Or Drop Pin on Map'}
                  </button>
                  {showMap && <div ref={mapRef} className="w-full h-[250px] rounded-lg border"></div>}

                  {customerLat && (
                    <div className="text-xs bg-green-50 p-2 rounded border-green-200">
                      <p className="font-semibold text-green-700">✅ Location Locked</p>
                      <p>Distance: {distanceKm.toFixed(2)} KM</p>
                      <p>Delivery: UGX {deliveryFee.toLocaleString()}</p>
                      <a href={`https://www.google.com/maps?q=${customerLat},${customerLng}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View on Google Maps</a>
                    </div>
                  )}
                </div>
              )}

              <select value={orderForm.payment_method} onChange={e => setOrderForm({...orderForm, payment_method: e.target.value })} className="w-full p-3 border rounded-lg bg-white">
                <option value="">Select Payment Method *</option>
                <option value="Cash on Delivery">Cash on Delivery</option>
                <option value="Airtel Money">Airtel Money</option>
                <option value="MTN MoMo">MTN MoMo</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Other">Other - specify below</option>
              </select>

              {orderForm.payment_method === 'Other' && (
                <input
                  type="text"
                  placeholder="Enter payment method e.g Wave, Chipper Cash"
                  value={otherPaymentMethod}
                  onChange={e => setOtherPaymentMethod(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                  required
                />
              )}

              <input type="text" placeholder="Transaction ID (Optional)" value={orderForm.transaction_id} onChange={e => setOrderForm({...orderForm, transaction_id: e.target.value })} className="w-full p-3 border rounded-lg" />
              <button onClick={validateAndConfirm} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 active:scale-95 transition">
                Review Order
              </button>
              <p className="text-xs text-slate-500 text-center">* Required fields</p>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowConfirm(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-4">Confirm Your Order</h2>

            <div className="bg-slate-50 rounded-lg p-4 mb-4 text-sm space-y-1">
              <p><span className="font-semibold">Name:</span> {orderForm.name}</p>
              <p><span className="font-semibold">Phone:</span> {orderForm.phone}</p>
              <p><span className="font-semibold">Fulfillment:</span> {isPickup ? 'Pickup' : 'Delivery'}</p>
              {customerLat && <p><span className="font-semibold">Location:</span> <a href={`https://www.google.com/maps?q=${customerLat},${customerLng}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View on Map</a></p>}
              {!customerLat && <p><span className="font-semibold">Location:</span> Customer Pickup</p>}
              <p><span className="font-semibold">Payment:</span> {orderForm.payment_method === 'Other' ? otherPaymentMethod : orderForm.payment_method}</p>
              {orderForm.transaction_id && <p><span className="font-semibold">Txn ID:</span> {orderForm.transaction_id}</p>}
            </div>

            <div className="border-t border-b py-3 mb-4">
              <p className="font-semibold mb-2">{totalItems} Items</p>
              <div className="space-y-1 text-sm max-h-32 overflow-y-auto">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.name} x{item.qty}</span>
                    <span>UGX {((item.retail_price || 0) * item.qty).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xl font-bold mb-6">
              <div className="flex justify-between text-sm font-normal">
                <span>Items:</span> <span>UGX {itemsTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-normal">
                <span>Delivery @UGX {PRICE_PER_KM}/KM:</span> <span>UGX {deliveryFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Total:</span> <span>UGX {grandTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 bg-slate-200 text-slate-900 py-3 rounded-lg font-bold hover:bg-slate-300"
              >
                Back
              </button>
              <button
                onClick={handleOrder}
                disabled={submitting}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold disabled:bg-slate-400 hover:bg-green-700 active:scale-95 transition"
              >
                {submitting ? 'Placing...' : 'Confirm & Place Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
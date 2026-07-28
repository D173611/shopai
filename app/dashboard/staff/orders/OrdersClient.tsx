'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/utils/supabase/client'
import LiveOrdersQueue, { type Order } from './LiveOrdersQueue'
import { User } from '@supabase/supabase-js'

export default function OrdersClient({
  initialOrders,
  user
}: {
  initialOrders: Order[]
  user: User
}) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [shopId, setShopId] = useState<string | null>(null)
  const [pricePerKm, setPricePerKm] = useState<number>(1000) // 1. NEW STATE
  const [saving, setSaving] = useState(false) // 2. NEW STATE
  const supabase = createClient()

  // 1. Get cashier's shop_id AND shop settings
  useEffect(() => {
    async function getShop() {
      const { data: staffMember } = await supabase
        .from('staff_members')
        .select('shop_id')
        .eq('user_id', user.id)
        .eq('role', 'cashier')
        .maybeSingle()
      
      if (staffMember?.shop_id) {
        setShopId(staffMember.shop_id)

        // 3. NEW: Fetch price_per_km from shop_settings
        const { data: settings } = await supabase
          .from('shop_settings')
          .select('price_per_km')
          .eq('shop_id', staffMember.shop_id)
          .single()
        
        if (settings) setPricePerKm(settings.price_per_km)
      }
    }
    getShop()
  }, [user.id, supabase])

  // 4. NEW: Save price per km function
  async function savePrice() {
    if (!shopId) return
    setSaving(true)
    await supabase.from('shop_settings').upsert({
      shop_id: shopId,
      price_per_km: pricePerKm
    })
    setSaving(false)
    alert('Price per KM saved!')
  }

  // 2. Real-time with shop filter - KEEP ITEMS ON UPDATE
  useEffect(() => {
    if (!shopId) return

    const channel = supabase
      .channel(`orders-shop-${shopId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `shop_id=eq.${shopId}`
        },
        async (payload) => {
          console.log('REALTIME PAYLOAD:', payload.eventType, (payload.new as Order)?.id || (payload.old as Order)?.id)

          if (payload.eventType === 'INSERT') {
            const { data: fullOrder } = await supabase
              .from('orders')
              .select(`
                *,
                order_items (
                  *,
                  products (name, image_url, retail_price)
                )
              `)
              .eq('id', (payload.new as Order).id)
              .single()

            if (fullOrder) {
              const isVisible = 
                ['pending', 'processing'].includes(fullOrder.order_status) &&
                (!fullOrder.locked_by_cashier_id || fullOrder.locked_by_cashier_id === user.id)
              
              if (isVisible) {
                setOrders(current => [fullOrder as Order, ...current])
              }
            }
          }

          if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as Order
            setOrders(current =>
              current.map(order => {
                if (order.id !== updatedOrder.id) return order
                
                const stillVisible = 
                  ['pending', 'processing'].includes(updatedOrder.order_status) &&
                  (!updatedOrder.locked_by_cashier_id || updatedOrder.locked_by_cashier_id === user.id)
                
                if (!stillVisible) return null
                
                return { ...order, ...updatedOrder, items: order.items } as Order
              }).filter(Boolean) as Order[]
            )
          }

          if (payload.eventType === 'DELETE') {
            const deletedOrder = payload.old as Order
            setOrders(current => current.filter(order => order.id !== deletedOrder.id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [shopId, user.id, supabase])

  return (
    <div className="min-h-screen p-6 space-y-6">
      
      {/* 5. NEW: PRICE SETTING BOX ON TOP */}
      <div className="bg-white/95 backdrop-blur-xl p-4 rounded-xl shadow-xl border-white/50">
        <h2 className="font-bold text-slate-800">🚚 Delivery Settings</h2>
        <div className="flex items-center gap-3 mt-2">
          <label className="text-sm font-medium text-slate-600">Price per KM UGX:</label>
          <input 
            type="number" 
            value={pricePerKm}
            onChange={(e) => setPricePerKm(Number(e.target.value))}
            className="border rounded-lg px-3 py-2 w-32"
          />
          <button 
            onClick={savePrice}
            disabled={saving}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-1">This price will be used to calculate customer delivery fee</p>
      </div>

      <header className="flex justify-between items-center bg-white/95 backdrop-blur-xl p-4 rounded-xl shadow-xl border-white/50">
        <div>
          <h1 className="text-xl font-black text-slate-800">📡 All Orders</h1>
          <p className="text-xs text-slate-500">Showing orders for your shop</p>
        </div>
        <div className="text-xs text-slate-500">
          Logged in: {user.email}
        </div>
      </header>

      <LiveOrdersQueue serverOrders={orders} currentUser={user} />
    </div>
  )
}
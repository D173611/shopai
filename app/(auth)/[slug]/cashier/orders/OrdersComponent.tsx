'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/app/utils/supabase/client'
import LiveOrdersQueue, { type Order } from './LiveOrdersQueue'
import { User } from '@supabase/supabase-js'

type Props = {
  shop: { id: string; name: string; slug: string }
  user: User
}

export default function OrdersComponent({ shop, user }: Props) {
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const loadOrders = useCallback(async () => {
    const { data: staffMember } = await supabase
      .from('staff_members')
      .select('shop_id')
      .eq('user_id', user.id)
      .eq('role', 'cashier')
      .maybeSingle()

    if (!staffMember?.shop_id) {
      setError('Your account is not assigned to a shop. Contact admin.')
      setLoading(false)
      return
    }
    
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (name, image_url, retail_price)
        )
      `)
      .eq('shop_id', staffMember.shop_id)
      .in('order_status', ['pending', 'processing'])
      .or(`locked_by_cashier_id.is.null,locked_by_cashier_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(100)

    if (ordersError) {
      setError(ordersError.message)
      setLoading(false)
      return
    }

    setOrders(orders ?? [])
    setLoading(false)
  }, [shop.id, user.id, supabase])

  useEffect(() => {
    setLoading(true)
    loadOrders()

    // Real-time subscription - merge instead of refetch
    const channel = supabase
      .channel(`orders-shop-${shop.id}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `shop_id=eq.${shop.id}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const { data: fullOrder } = await supabase
              .from('orders')
              .select(`*, order_items(*, products(name, image_url, retail_price))`)
              .eq('id', (payload.new as Order).id)
              .single()
            
            if (fullOrder) {
              const isVisible = 
                ['pending', 'processing'].includes(fullOrder.order_status) &&
                (!fullOrder.locked_by_cashier_id || fullOrder.locked_by_cashier_id === user.id)
              if (isVisible) setOrders(current => [fullOrder as Order, ...current])
            }
          }

          if (payload.eventType === 'UPDATE') {
            setOrders(current =>
              current.map(order => {
                if (order.id !== (payload.new as Order).id) return order
                const stillVisible = 
                  ['pending', 'processing'].includes((payload.new as Order).order_status) &&
                  (!(payload.new as Order).locked_by_cashier_id || (payload.new as Order).locked_by_cashier_id === user.id)
                return stillVisible ? { ...order, ...(payload.new as Order), items: order.items } : null
              }).filter(Boolean) as Order[]
            )
          }

          if (payload.eventType === 'DELETE') {
            setOrders(current => current.filter(order => order.id !== (payload.old as Order).id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [shop.id, user.id, loadOrders, supabase])

  if (loading) {
    return <div className="min-h-screen p-6 text-white">Loading...</div>
  }

  if (error) {
    return (
      <div className="min-h-screen p-6">
        <div className="bg-rose-500/20 backdrop-blur-xl border border-rose-400/30 text-white p-4 rounded-xl">
          {error.startsWith('DB Error') ? error : `Error: ${error}`}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      <header className="flex justify-between items-center bg-white/70 backdrop-blur-xl p-4 rounded-xl shadow-xl border border-white/30">
        <div>
          <h1 className="text-xl font-black text-slate-800">📡 Available Orders</h1>
          <p className="text-xs text-slate-600">Showing unlocked orders for your shop + your locked orders</p>
        </div>
        <div className="text-xs text-slate-600 font-bold">
          Logged in: {user.email}
        </div>
      </header>

      <LiveOrdersQueue serverOrders={orders ?? []} currentUser={user} slug={shop.slug} />
    </div>
  )
}
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/app/utils/supabase/client'
import CheckoutPanel from '@/app/dashboard/CheckoutPanel'
import LiveOrdersQueue from '../orders/LiveOrdersQueue'
import { Product } from '@/app/dashboard/types'
import { User } from '@supabase/supabase-js'

type Props = {
  shop: { id: string; name: string; slug: string }
  user: User
}

export default function POSComponent({ shop, user }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const loadData = async () => {
      // 1. Get cashier's shop_id from staff_members
      const { data: staffMember, error: staffError } = await supabase
    .from('staff_members')
    .select('shop_id, role')
    .eq('user_id', user.id)
    .eq('role', 'cashier')
    .maybeSingle()

      if (staffError || !staffMember?.shop_id) {
        console.error('Staff check error:', staffError)
        setError('Your account is not assigned as a cashier for any shop. Contact admin.')
        setLoading(false)
        return
      }

      const shopId = staffMember.shop_id

      // 2. Fetch products
      const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('shop_id', shopId)
    .gt('stock_quantity', 0)
    .order('name')

      // 3. Fetch orders - UNLOCKED + YOUR LOCKED ONES
      const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(`
          *,
          order_items (*)
        `)
    .eq('shop_id', shopId)
    .in('order_status', ['new', 'pending', 'processing'])
    .or(`locked_by_cashier_id.is.null,locked_by_cashier_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

      // 4. Manually fetch products for those order_items
      if (orders && orders.length > 0) {
        const productIds = orders
        .flatMap(o => o.order_items?.map((i: any) => i.product_id) || [])
        .filter(Boolean)

        if (productIds.length > 0) {
          const { data: productsData } = await supabase
          .from('products')
          .select('id, name, image_url, retail_price')
          .in('id', [...new Set(productIds)])

          // Merge products into order_items so LiveOrdersQueue still works
          const productsMap = new Map(productsData?.map(p => [p.id, p]) || [])
          orders.forEach(order => {
            order.order_items?.forEach((item: any) => {
              item.products = productsMap.get(item.product_id) || null
            })
          })
        }
      }

      console.log('Shop ID:', shopId)
      console.log('Orders found:', orders?.length)
      console.log('Orders error:', ordersError)

      if (ordersError) {
        setError(ordersError.message)
      }

      setProducts((products as Product[]) ?? [])
      setOrders(orders || [])
      setLoading(false)
    }

    loadData()

    // Real-time subscription for orders - INSTANT REMOVAL
    const channel = supabase
  .channel(`cashier-orders-${shop.id}`)
  .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `shop_id=eq.${shop.id}`
      }, (payload) => {
        console.log('Order UPDATE detected:', payload)
        const updatedOrder = payload.new as any
        
        // If order was locked by someone else, remove it immediately
        if (updatedOrder.locked_by_cashier_id && 
            updatedOrder.locked_by_cashier_id !== user.id) {
          setOrders(prev => prev.filter(o => o.id !== updatedOrder.id))
        } 
        // If order was unlocked or status changed, refetch
        else {
          loadData()
        }
      })
  .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `shop_id=eq.${shop.id}`
      }, () => {
        console.log('New order detected')
        loadData()
      })
  .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'orders',
        filter: `shop_id=eq.${shop.id}`
      }, (payload) => {
        console.log('Order DELETE detected:', payload)
        setOrders(prev => prev.filter(o => o.id !== payload.old.id))
      })
  .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [shop.id, user.id])

  const cashierName = user.user_metadata?.name || user.email?.split('@')[0] || 'Cashier'

  if (loading) {
    return <div className="p-8 text-white">Loading...</div>
  }

  if (error) {
    return (
      <div className="min-h-screen p-6">
        <div className="bg-rose-500/20 backdrop-blur-xl border border-rose-400/30 text-white p-4 rounded-xl">
          Error: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-[1600px] mx-auto p-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div>
          <h2 className="text-white font-bold text-xl mb-4 drop-shadow-lg">
            📡 Live Orders ({orders?.length || 0})
          </h2>
          <p className="text-xs text-white/60 mb-2">Shop ID: {shop.id}</p>
          <LiveOrdersQueue
            serverOrders={orders || []}
            currentUser={user as User}
            slug={shop.slug}
          />
        </div>
        <div>
          <h2 className="text-white font-bold text-xl mb-4 drop-shadow-lg">💳 POS Terminal</h2>
          <CheckoutPanel
            products={(products as Product[]) ?? []}
            shopId={shop.id}
            slug={shop.slug}
            cashierId={user.id}
            cashierName={cashierName}
          />
        </div>
      </div>
    </div>
  )
}
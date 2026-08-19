'use client'

import { useState, useTransition, useEffect } from 'react'
import { lockOrder, cancelOrder, deleteOrder, completeOrder, unlockOrder } from '@/app/dashboard/staff/orders/actions'
import { User } from '@supabase/supabase-js'
import Image from 'next/image'
import ReactDOMServer from 'react-dom/server' // 1. ADD THIS
import Receipt from '@/app/components/Receipt'

export type OrderItem = {
  product_id?: string
  id?: string
  product_name?: string
  name?: string
  quantity?: number
  qty?: number
  price: number
  image_url?: string
}

export type Order = {
  id: string
  customer_name: string
  delivery_address: string
  google_maps_link: string
  customer_whatsapp: string
  total: number | string
  total_amount: number | string
  items_total?: number | string
  delivery_fee?: number | string
  item_count?: number
  fulfillment_type?: 'pickup' | 'delivery' | 'shop'
  order_status: string
  locked_by_cashier_id: string | null
  locked_at: string | null
  cancelled_by: string | null
  cancelled_at: string | null
  created_at: string
  items: OrderItem[]
  order_items?: any[]
  transaction_id?: string | null
  payment_method?: string | null
  shop_id: string
}

export default function LiveOrdersQueue({
  serverOrders,
  currentUser
}: {
  serverOrders: Order[]
  currentUser: User
}) {
  const [isPending, startTransition] = useTransition()
  const [localOrders, setLocalOrders] = useState<Order[]>(serverOrders)

  useEffect(() => {
    setLocalOrders(current => {
      const localOrderMap = new Map(current.map(o => [o.id, o]))
      const merged: Order[] = serverOrders.map(serverOrder => {
        const localOrder = localOrderMap.get(serverOrder.id)
        if (!localOrder) return serverOrder
        return {...serverOrder }
      })
      return merged
    })
  }, [serverOrders])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  // 2. NEW FUNCTION: PRINT ONLY RECEIPT IN NEW WINDOW
  const printReceiptOnly = (orderData: any, shopData: any) => {
    const receiptHtml = ReactDOMServer.renderToString(<Receipt order={orderData} shop={shopData} />)
    
    const printWindow = window.open('', '_blank', 'width=300,height=600')
    if (!printWindow) return alert('Please allow popups for this site')

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { font-family: 'Courier New', monospace; width: 80mm; margin: 0; padding: 5mm; font-size: 12px; }
           .no-print-bg { background: white!important; }
          </style>
        </head>
        <body onload="window.print(); window.close()">
          ${receiptHtml}
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  async function handleLock(orderId: string) {
    console.log('1. BUTTON CLICKED')
    setLocalOrders(current =>
      current.map(o =>
        o.id === orderId
         ? {...o, order_status: 'processing', locked_by_cashier_id: currentUser.id, locked_at: new Date().toISOString() }
          : o
      )
    )
    startTransition(async () => {
      const res = await lockOrder(orderId)
      console.log('4. SERVER ACTION RESPONSE:', res)
      if (res.error) alert(res.error)
    })
  }

  async function handleUnlock(orderId: string) {
    if (!confirm('Unlock this order? Other cashiers will be able to take it.')) return
    setLocalOrders(current =>
      current.map(o =>
        o.id === orderId
         ? {...o, order_status: 'pending', locked_by_cashier_id: null, locked_at: null }
          : o
      )
    )
    startTransition(async () => {
      const res = await unlockOrder(orderId)
      if (res.error) alert(res.error)
    })
  }

  async function handleCancel(orderId: string) {
    setLocalOrders(current =>
      current.map(o =>
        o.id === orderId
         ? {...o, order_status: 'cancelled', locked_by_cashier_id: null, cancelled_by: currentUser.id, cancelled_at: new Date().toISOString() }
          : o
      )
    )
    startTransition(async () => {
      const res = await cancelOrder(orderId)
      if (res.error) alert(res.error)
    })
  }

  async function handleDelete(orderId: string) {
    if (!confirm('Permanently delete this order?')) return
    setLocalOrders(current => current.filter(o => o.id!== orderId))
    startTransition(async () => {
      const res = await deleteOrder(orderId)
      if (res.error) alert(res.error)
    })
  }

  async function handleComplete(orderId: string) {
    if (!confirm('Mark this order as delivered? Stock will be reduced and this cannot be undone.')) return
    setLocalOrders(current =>
      current.map(o =>
        o.id === orderId
         ? {...o, order_status: 'delivered' }
          : o
      )
    )
    startTransition(async () => {
      const res = await completeOrder(orderId) // NOW RETURNS {order, shop}
      if (res.error) {
        alert(res.error)
      } else {
        alert('Order completed. Stock updated. Receipt printing...')
        
        // 3. CALL NEW PRINT FUNCTION INSTEAD OF MOUNTING COMPONENT
        if (res.order && res.shop) {
          printReceiptOnly(res.order, res.shop)
        }
      }
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {localOrders?.map(order => {
        const isLockedByMe = order.locked_by_cashier_id === currentUser.id
        const isLockedByOther = Boolean(order.locked_by_cashier_id &&!isLockedByMe)
        const isPendingLock = order.order_status === 'pending' &&!order.locked_by_cashier_id

        const displayTotal = Number(order.total || order.total_amount || 0)
        const displayItemsTotal = Number(order.items_total || 0)
        const displayDeliveryFee = Number(order.delivery_fee || 0)
        const displayItems = order.order_items && order.order_items.length > 0? order.order_items : order.items

        return (
          <div key={order.id} className={`p-6 rounded-2xl border-2 backdrop-blur-xl transition shadow-2xl space-y-4 ${
            order.locked_by_cashier_id? 'bg-amber-50/95 border-amber-400' : 'bg-white/95 border-slate-300'
          } ${isPending? 'opacity-70' : ''}`}>

            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex gap-2 items-center mb-2">
                  <span className={`text-sm px-3 py-1 rounded-full font-black uppercase tracking-wide ${
                    order.order_status === 'processing'? 'bg-amber-200 text-amber-900' :
                    order.order_status === 'cancelled'? 'bg-rose-200 text-rose-900' :
                    order.order_status === 'delivered'? 'bg-green-200 text-green-900' :
                    'bg-blue-200 text-blue-900'
                  }`}>
                    {order.order_status}
                  </span>
                  {order.fulfillment_type === 'pickup' && (
                    <span className="text-xs bg-green-200 text-green-900 px-2 py-1 rounded-full font-bold">📦 PICKUP</span>
                  )}
                  {order.fulfillment_type === 'delivery' && (
                    <span className="text-xs bg-blue-200 text-blue-900 px-2 py-1 rounded-full font-bold">🚚 DELIVERY</span>
                  )}
                </div>

                <h3 className="font-black text-slate-900 text-xl mt-2">{order.customer_name}</h3>

                <div className="mt-2 space-y-2 bg-blue-50 p-3 rounded-lg border-blue-200">
                  <p className="text-sm text-slate-800 font-semibold">📍 {order.delivery_address || 'No address'}</p>
                  {order.google_maps_link && (
                    <div className="space-y-2">
                      <a href={order.google_maps_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline font-bold block break-all">
                        {order.google_maps_link}
                      </a>
                      <button onClick={() => copyToClipboard(order.google_maps_link)} className="text-xs bg-white border-blue-300 text-blue-700 px-3 py-1 rounded-lg font-bold hover:bg-blue-100">
                        📋 Copy Location Link
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-sm text-slate-800 font-semibold mt-2">💬 {order.customer_whatsapp}</p>
                {order.payment_method && (<p className="text-sm text-slate-800 font-bold mt-1">💳 {order.payment_method}</p>)}
                {order.transaction_id && (<p className="text-xs text-slate-700 mt-1 font-mono font-bold">Txn: {order.transaction_id}</p>)}
                <p className="text-xs text-slate-600 mt-2 font-medium">{new Date(order.created_at).toLocaleString()}</p>
              </div>

              <div className="text-right">
                <span className="text-xl font-black text-slate-900 font-mono">
                  UGX {order.fulfillment_type === 'pickup'? displayItemsTotal.toLocaleString() : displayTotal.toLocaleString()}
                </span>
                {order.fulfillment_type === 'delivery' && displayDeliveryFee > 0 && (
                  <div className="text-xs text-gray-500 mt-1">Items: {displayItemsTotal.toLocaleString()} + Del: {displayDeliveryFee.toLocaleString()}</div>
                )}
                {order.item_count!== undefined && (<div className="text-xs text-slate-600 mt-1">Items: {order.item_count}</div>)}
              </div>
            </div>

            {displayItems && displayItems.length > 0 && (
              <div className="bg-slate-100/90 p-4 rounded-xl space-y-3 border-2 border-slate-300">
                <p className="text-sm font-black text-slate-900 uppercase">Items to pack:</p>
                {displayItems.map((item: any, idx: number) => {
                  const itemName = item.products?.name || item.product_name || item.name || 'Unnamed item'
                  const itemQty = item.quantity || item.qty || 1
                  const itemPrice = item.products?.retail_price || item.price
                  const itemImage = item.products?.image_url || item.image_url
                  return (
                    <div key={idx} className="flex items-center gap-4 bg-white p-3 rounded-lg border-slate-200">
                      {itemImage? (
                        <Image src={itemImage} alt={itemName} width={56} height={56} className="rounded-lg object-cover border-2 border-slate-200" />
                      ) : (
                        <div className="w-14 h-14 bg-slate-300 rounded-lg flex items-center justify-center text-2xl">📦</div>
                      )}
                      <div className="flex-1">
                        <p className="text-base font-black text-slate-900">{itemName}</p>
                        <p className="text-sm text-slate-800 font-bold">Qty: {itemQty} × UGX {Number(itemPrice).toLocaleString()}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex gap-2 border-t-2 border-slate-300 pt-4 flex-wrap">
              {isPendingLock? (
                <button onClick={() => handleLock(order.id)} disabled={isPending} className="flex-1 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-black p-3.5 rounded-xl text-base transition">
                  ⚡ Accept & Lock
                </button>
              ) : isLockedByMe && order.order_status === 'processing'? (
                <>
                  <button onClick={() => handleComplete(order.id)} disabled={isPending} className="flex-1 bg-green-700 hover:bg-green-600 disabled:bg-slate-400 text-white font-black p-3.5 rounded-xl text-base transition">
                    ✅ Mark Delivered
                  </button>
                  <button onClick={() => handleUnlock(order.id)} disabled={isPending} className="bg-amber-200 text-amber-900 hover:bg-amber-300 disabled:bg-slate-100 border-2 border-amber-400 text-sm font-black px-5 py-3.5 rounded-xl transition">
                    🔓 Unlock
                  </button>
                  <button onClick={() => handleCancel(order.id)} disabled={isPending} className="bg-rose-200 text-rose-900 hover:bg-rose-300 disabled:bg-slate-100 border-2 border-rose-400 text-sm font-black px-5 py-3.5 rounded-xl transition">
                    Cancel
                  </button>
                </>
              ) : isLockedByMe? (
                <div className="bg-green-200 text-green-900 p-3 rounded-xl text-base font-black text-center flex-1 border-2 border-green-400">
                  ✅ Locked by you
                </div>
              ) : isLockedByOther? (
                <div className="bg-amber-200 text-amber-900 p-3 rounded-xl text-base font-black text-center flex-1 border-2 border-amber-400">
                  🔒 Locked by another agent
                </div>
              ) : (
                <div className="bg-slate-200 text-slate-900 p-3 rounded-xl text-base font-black text-center flex-1 border-2 border-slate-400">
                  {order.order_status}
                </div>
              )}

              {isPendingLock && order.order_status!== 'cancelled' && (
                <button onClick={() => handleCancel(order.id)} disabled={isPending} className="bg-rose-200 text-rose-900 hover:bg-rose-300 disabled:bg-slate-100 border-2 border-rose-400 text-sm font-black px-5 py-3.5 rounded-xl transition">
                  Cancel
                </button>
              )}

              {order.locked_by_cashier_id === currentUser.id && (
                <button onClick={() => handleDelete(order.id)} disabled={isPending} className="bg-slate-200 hover:bg-red-200 text-slate-900 hover:text-red-900 border-2 border-slate-400 text-base font-black px-4 py-3.5 rounded-xl transition" title="Delete order permanently">
                  🗑️
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
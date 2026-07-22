'use client'

import { useState, useTransition, useEffect } from 'react'
import { lockOrder, cancelOrder, deleteOrder, completeOrder, unlockOrder } from './actions'
import { User } from '@supabase/supabase-js'
import Image from 'next/image'

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
  customer_whatsapp: string
  total_amount: number | string
  order_status: string
  locked_by_cashier_id: string | null
  locked_at: string | null
  cancelled_by: string | null
  cancelled_at: string | null
  created_at: string
  items: OrderItem[]
  transaction_id?: string | null
  payment_method?: string | null
  shop_id?: string | null
}

export default function LiveOrdersQueue({
  serverOrders,
  currentUser,
  slug
}: {
  serverOrders: Order[]
  currentUser: User
  slug: string
}) {
  const [isPending, startTransition] = useTransition()
  const [localOrders, setLocalOrders] = useState<Order[]>(serverOrders)

  // Sync with real-time updates
  useEffect(() => {
    setLocalOrders(serverOrders)
  }, [serverOrders])

  async function handleLock(orderId: string) {
    // Optimistic update
    setLocalOrders(current =>
      current.map(o =>
        o.id === orderId
      ? {...o, order_status: 'processing', locked_by_cashier_id: currentUser.id, locked_at: new Date().toISOString() }
          : o
      )
    )

    startTransition(async () => {
      const res = await lockOrder(orderId, slug)
      if (res.error) {
        alert(res.error)
      }
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
      const res = await unlockOrder(orderId, slug)
      if (res.error) {
        alert(res.error)
      }
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
      const res = await cancelOrder(orderId, slug)
      if (res.error) {
        alert(res.error)
      }
    })
  }

  async function handleDelete(orderId: string) {
    if (!confirm('Permanently delete this order?')) return
    setLocalOrders(current => current.filter(o => o.id!== orderId))
    startTransition(async () => {
      const res = await deleteOrder(orderId, slug)
      if (res.error) {
        alert(res.error)
      }
    })
  }

  async function handleComplete(orderId: string) {
    if (!confirm('Mark this order as delivered? Stock will be reduced.')) return
    if (!confirm('Are you absolutely sure? This will deduct items from inventory and cannot be undone.')) return

    setLocalOrders(current =>
      current.map(o =>
        o.id === orderId
      ? {...o, order_status: 'delivered' }
          : o
      )
    )
    startTransition(async () => {
      const res = await completeOrder(orderId, slug)
      if (res.error) {
        alert(res.error)
      } else {
        alert('Order completed. Stock updated.')
      }
    })
  }

  if (!localOrders || localOrders.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 text-center text-gray-400">
        <p className="text-sm">No pending orders</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-h-[800px] overflow-y-auto pr-1">
      {localOrders?.map(order => {
        const isLockedByMe = order.locked_by_cashier_id === currentUser.id
        const isLockedByOther = order.locked_by_cashier_id &&!isLockedByMe
        const isPendingLock = order.order_status === 'pending' &&!order.locked_by_cashier_id

        return (
          <div key={order.id} className={`p-5 rounded-xl border-2 backdrop-blur-xl transition shadow-lg space-y-3 ${
            order.locked_by_cashier_id
          ? 'bg-amber-50/95 border-amber-400'
              : 'bg-white/95 border-slate-300'
          } ${isPending? 'opacity-70' : ''}`}>
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <span className={`text-xs px-2.5 py-1 rounded-full font-black uppercase tracking-wide ${
                  order.order_status === 'processing'? 'bg-amber-200 text-amber-900' :
                  order.order_status === 'cancelled'? 'bg-rose-200 text-rose-900' :
                  order.order_status === 'delivered'? 'bg-green-200 text-green-900' :
                  'bg-blue-200 text-blue-900'
                }`}>
                  {order.order_status}
                </span>
                <h3 className="font-black text-slate-900 text-lg mt-2">{order.customer_name}</h3>
                <p className="text-sm text-slate-800 font-semibold mt-1">📍 {order.delivery_address}</p>
                <p className="text-sm text-slate-800 font-semibold">💬 {order.customer_whatsapp}</p>
                {order.payment_method && (
                  <p className="text-sm text-slate-800 font-bold mt-1">💳 {order.payment_method}</p>
                )}
                {order.transaction_id && (
                  <p className="text-xs text-slate-700 mt-1 font-mono font-bold">Txn: {order.transaction_id}</p>
                )}
                <p className="text-xs text-slate-600 mt-2 font-medium">{new Date(order.created_at).toLocaleString()}</p>
              </div>
              <span className="text-lg font-black text-slate-900 font-mono">UGX {Number(order.total_amount).toLocaleString()}</span>
            </div>

            {order.items && order.items.length > 0 && (
              <div className="bg-slate-100/90 p-3 rounded-lg space-y-2 border border-slate-300">
                <p className="text-xs font-black text-slate-900 uppercase">Items to pack:</p>
                {order.items.map((item, idx) => {
                  const itemName = item.product_name || item.name || 'Unnamed item'
                  const itemQty = item.quantity || item.qty || 1
                  return (
                    <div key={idx} className="flex items-center gap-3 bg-white p-2 rounded border border-slate-200">
                      {item.image_url? (
                        <Image
                          src={item.image_url}
                          alt={itemName}
                          width={48}
                          height={48}
                          className="rounded object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-slate-300 rounded flex items-center justify-center text-xl">📦</div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-black text-slate-900">{itemName}</p>
                        <p className="text-xs text-slate-800 font-bold">Qty: {itemQty} × UGX {Number(item.price).toLocaleString()}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex gap-2 border-t border-slate-300 pt-3 flex-wrap">
              {isPendingLock? (
                <button
                  onClick={() => handleLock(order.id)}
                  disabled={isPending}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-black p-3 rounded-lg text-sm transition"
                >
                  ⚡ Accept & Lock
                </button>
              ) : isLockedByMe && order.order_status === 'processing'? (
                <>
                  <button
                    onClick={() => handleComplete(order.id)}
                    disabled={isPending}
                    className="flex-1 bg-green-700 hover:bg-green-600 disabled:bg-slate-400 text-white font-black p-3 rounded-lg text-sm transition"
                  >
                    ✅ Mark Delivered
                  </button>
                  <button
                    onClick={() => handleUnlock(order.id)}
                    disabled={isPending}
                    className="bg-amber-200 text-amber-900 hover:bg-amber-300 disabled:bg-slate-100 border border-amber-400 text-xs font-black px-4 py-3 rounded-lg transition"
                  >
                    🔓 Unlock
                  </button>
                  <button
                    onClick={() => handleCancel(order.id)}
                    disabled={isPending}
                    className="bg-rose-200 text-rose-900 hover:bg-rose-300 disabled:bg-slate-100 border border-rose-400 text-xs font-black px-4 py-3 rounded-lg transition"
                  >
                    Cancel
                  </button>
                </>
              ) : isLockedByMe? (
                <div className="bg-green-200 text-green-900 p-3 rounded-lg text-sm font-black text-center flex-1 border border-green-400">
                  ✅ Locked by you
                </div>
              ) : isLockedByOther? (
                <div className="bg-amber-200 text-amber-900 p-3 rounded-lg text-sm font-black text-center flex-1 border border-amber-400">
                  🔒 Locked by another agent
                </div>
              ) : (
                <div className="bg-slate-200 text-slate-900 p-3 rounded-lg text-sm font-black text-center flex-1 border border-slate-400">
                  {order.order_status}
                </div>
              )}

              {isPendingLock && order.order_status!== 'cancelled' && (
                <button
                  onClick={() => handleCancel(order.id)}
                  disabled={isPending}
                  className="bg-rose-200 text-rose-900 hover:bg-rose-300 disabled:bg-slate-100 border border-rose-400 text-xs font-black px-4 py-3 rounded-lg transition"
                >
                  Cancel
                </button>
              )}

              {order.locked_by_cashier_id === currentUser.id && (
                <button
                  onClick={() => handleDelete(order.id)}
                  disabled={isPending}
                  className="bg-slate-200 hover:bg-red-200 text-slate-900 hover:text-red-900 border border-slate-400 text-sm font-black px-3 py-3 rounded-lg transition"
                  title="Delete order permanently"
                >
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
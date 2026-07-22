'use server'

import { createClient } from '@/app/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function lockOrder(orderId: string, slug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // 1. AUTO-UNLOCK STALE ORDERS FIRST - clears orders stuck >10 min
  await supabase
    .from('orders')
    .update({ 
      order_status: 'pending',
      locked_by_cashier_id: null,
      locked_at: null
    })
    .eq('order_status', 'processing')
    .lt('locked_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())

  // 2. Try to lock the requested order - ACCEPTS 'new' OR 'pending'
  const { data, error } = await supabase
    .from('orders')
    .update({
      order_status: 'processing',
      locked_by_cashier_id: user.id,
      locked_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .in('order_status', ['new', 'pending']) // <-- FIX: accepts both
    .is('locked_by_cashier_id', null)
    .select()
    .single()

  if (error || !data) {
    console.error('LOCK ORDER ERROR:', error)
    return { success: false, error: 'Order already taken by another agent' }
  }
  
  revalidatePath(`/${slug}/cashier/orders`)
  return { success: true, order: data }
}

export async function unlockOrder(orderId: string, slug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase
    .from('orders')
    .update({ 
      order_status: 'pending',
      locked_by_cashier_id: null,
      locked_at: null
    })
    .eq('id', orderId)
    .eq('locked_by_cashier_id', user.id)

  if (error) {
    console.error('UNLOCK ORDER ERROR:', error)
    return { success: false, error: 'You can only unlock orders you locked' }
  }
  
  revalidatePath(`/${slug}/cashier/orders`)
  return { success: true }
}

export async function cancelOrder(orderId: string, slug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }
  
  const { error } = await supabase
    .from('orders')
    .update({ 
      order_status: 'cancelled', 
      locked_by_cashier_id: null,
      locked_at: null,
      cancelled_by: user.id,
      cancelled_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .or(`locked_by_cashier_id.is.null,locked_by_cashier_id.eq.${user.id}`)

  if (error) {
    console.error('CANCEL ORDER ERROR:', error)
    return { success: false, error: 'Cannot cancel - order locked by another agent' }
  }
  
  revalidatePath(`/${slug}/cashier/orders`)
  return { success: true }
}

export async function deleteOrder(orderId: string, slug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', orderId)
    .eq('locked_by_cashier_id', user.id)

  if (error) {
    console.error('DELETE ORDER ERROR:', error)
    return { success: false, error: 'You can only delete orders you processed' }
  }
  
  revalidatePath(`/${slug}/cashier/orders`)
  return { success: true }
}

export async function completeOrder(orderId: string, slug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // 1. Get the order + items
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, items, order_status, locked_by_cashier_id')
    .eq('id', orderId)
    .single()

  if (fetchError || !order) {
    console.error('FETCH ORDER ERROR:', fetchError)
    return { success: false, error: 'Order not found' }
  }

  if (order.locked_by_cashier_id !== user.id) {
    return { success: false, error: 'Only the assigned cashier can complete this order' }
  }

  if (order.order_status === 'delivered') {
    return { success: false, error: 'Order already completed' }
  }

  // 2. Reduce stock for each item - FIXED FOR NULL/STRING
  let items: any[] = []
  if (order.items) {
    items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items
  }
  
  for (const item of items) {
    if (!item.product_id) continue
    
    const { error: stockError } = await supabase.rpc('decrement_stock', {
      p_id: item.product_id,
      qty: item.quantity
    })

    if (stockError) {
      console.error('Stock update failed:', stockError)
      return { success: false, error: `Not enough stock for ${item.product_name || 'item'}` }
    }
  }

  // 3. Mark order as delivered
  const { error: updateError } = await supabase
    .from('orders')
    .update({ 
      order_status: 'delivered',
      delivered_at: new Date().toISOString()
    })
    .eq('id', orderId)

  if (updateError) {
    console.error('COMPLETE ORDER ERROR:', updateError)
    console.error('Error code:', updateError.code)
    console.error('Error message:', updateError.message)
    return { success: false, error: 'Failed to update order status' }
  }
  
  revalidatePath(`/${slug}/cashier/orders`)
  revalidatePath(`/${slug}/dashboard/inventory`)
  return { success: true }
}
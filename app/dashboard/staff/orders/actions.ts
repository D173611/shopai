'use server'

import { createClient } from '@/app/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function lockOrder(orderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Not logged in' }

  // Don't use.single() - it throws PGRST116 on 0 rows
  const { data, error } = await supabase
   .from('orders')
   .update({
      order_status: 'processing',
      locked_by_cashier_id: user.id,
      locked_at: new Date().toISOString()
    })
   .eq('id', orderId)
   .eq('order_status', 'pending')
   .is('locked_by_cashier_id', null)
   .select()

  if (error) {
    console.error('LOCK ORDER DB ERROR:', error)
    return { success: false, error: 'Database error: ' + error.message }
  }

  if (!data || data.length === 0) {
    console.log('LOCK ORDER: No rows updated - order already taken or not pending')
    return { success: false, error: 'Order already taken or not available' }
  }

  revalidatePath('/dashboard/staff/orders')
  return { success: true, order: data[0] }
}

export async function unlockOrder(orderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not logged in' }

  const { data, error } = await supabase
   .from('orders')
   .update({
      order_status: 'pending',
      locked_by_cashier_id: null,
      locked_at: null
    })
   .eq('id', orderId)
   .eq('locked_by_cashier_id', user.id)
   .select()

  if (error) {
    console.error('UNLOCK ORDER ERROR:', error)
    return { success: false, error: 'Database error: ' + error.message }
  }

  if (!data || data.length === 0) {
    return { success: false, error: 'You can only unlock orders you locked' }
  }

  revalidatePath('/dashboard/staff/orders')
  return { success: true }
}

export async function cancelOrder(orderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not logged in' }

  const { data, error } = await supabase
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
   .select()

  if (error) {
    console.error('CANCEL ORDER ERROR:', error)
    return { success: false, error: 'Database error: ' + error.message }
  }

  if (!data || data.length === 0) {
    return { success: false, error: 'Cannot cancel - locked by another agent' }
  }

  revalidatePath('/dashboard/staff/orders')
  return { success: true }
}

export async function deleteOrder(orderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not logged in' }

  const { data, error } = await supabase
   .from('orders')
   .delete()
   .eq('id', orderId)
   .eq('locked_by_cashier_id', user.id)
   .select()

  if (error) {
    console.error('DELETE ORDER ERROR:', error)
    return { success: false, error: 'Database error: ' + error.message }
  }

  if (!data || data.length === 0) {
    return { success: false, error: 'You can only delete orders you processed' }
  }

  revalidatePath('/dashboard/staff/orders')
  return { success: true }
}

export async function completeOrder(orderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not logged in' }

  // 1. Get the order + items
  const { data: order, error: fetchError } = await supabase
   .from('orders')
   .select('id, items, order_status, locked_by_cashier_id')
   .eq('id', orderId)
   .single()

  if (fetchError ||!order) {
    console.error('FETCH ORDER ERROR:', fetchError)
    return { success: false, error: 'Order not found' }
  }

  if (order.locked_by_cashier_id!== user.id) {
    return { success: false, error: 'Only the assigned cashier can complete this order' }
  }

  if (order.order_status === 'delivered') {
    return { success: false, error: 'Order already completed' }
  }

  // 2. Reduce stock for each item
  let items: any[] = []
  if (order.items) {
    items = typeof order.items === 'string'? JSON.parse(order.items) : order.items
  }

  for (const item of items) {
    if (!item.product_id) continue

    const { error: stockError } = await supabase.rpc('decrement_stock', {
      p_id: item.product_id,
      qty: item.quantity || item.qty || 1
    })

    if (stockError) {
      console.error('Stock update failed:', stockError)
      return { success: false, error: `Not enough stock for ${item.product_name || item.name || 'item'}` }
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
    return { success: false, error: 'Failed to update order status: ' + updateError.message }
  }

  revalidatePath('/dashboard/staff/orders')
  revalidatePath('/dashboard/inventory')
  return { success: true }
}
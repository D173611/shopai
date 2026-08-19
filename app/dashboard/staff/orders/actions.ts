'use server'

import { createClient } from '@/app/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function lockOrder(orderId: string) {
  const supabase = await createClient()
  const { data, error: authError } = await supabase.auth.getUser()
  const user = data?.user
  if (authError ||!user) return { success: false, error: 'Not logged in' }

  const { data: orderData, error } = await supabase
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

  if (!orderData || orderData.length === 0) {
    console.log('LOCK ORDER: No rows updated - order already taken or not pending')
    return { success: false, error: 'Order already taken or not available' }
  }

  revalidatePath('/dashboard/staff/orders')
  return { success: true, order: orderData[0] }
}

export async function unlockOrder(orderId: string) {
  const supabase = await createClient()
  const { data, error: authError } = await supabase.auth.getUser()
  const user = data?.user
  if (authError ||!user) return { success: false, error: 'Not logged in' }

  const { data: orderData, error } = await supabase
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

  if (!orderData || orderData.length === 0) {
    return { success: false, error: 'You can only unlock orders you locked' }
  }

  revalidatePath('/dashboard/staff/orders')
  return { success: true }
}

export async function cancelOrder(orderId: string) {
  const supabase = await createClient()
  const { data, error: authError } = await supabase.auth.getUser()
  const user = data?.user
  if (authError ||!user) return { success: false, error: 'Not logged in' }

  const { data: orderData, error } = await supabase
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

  if (!orderData || orderData.length === 0) {
    return { success: false, error: 'Cannot cancel - locked by another agent' }
  }

  revalidatePath('/dashboard/staff/orders')
  return { success: true }
}

export async function deleteOrder(orderId: string) {
  const supabase = await createClient()
  const { data, error: authError } = await supabase.auth.getUser()
  const user = data?.user
  if (authError ||!user) return { success: false, error: 'Not logged in' }

  const { data: orderData, error } = await supabase
.from('orders')
.delete()
.eq('id', orderId)
.eq('locked_by_cashier_id', user.id)
.select()

  if (error) {
    console.error('DELETE ORDER ERROR:', error)
    return { success: false, error: 'Database error: ' + error.message }
  }

  if (!orderData || orderData.length === 0) {
    return { success: false, error: 'You can only delete orders you processed' }
  }

  revalidatePath('/dashboard/staff/orders')
  return { success: true }
}

export async function completeOrder(orderId: string) {
  const supabase = await createClient()
  const { data, error: authError } = await supabase.auth.getUser()
  const user = data?.user
  if (authError ||!user) return { success: false, error: 'Not logged in' }

  // 1. Fetch order with items + coords + shop_id + customer info
  const { data: order, error: fetchError } = await supabase
.from('orders')
.select(`
    id,
    shop_id,
    customer_name,
    customer_whatsapp,
    customer_lat,
    customer_lng,
    delivery_address,
    google_maps_link,
    created_at,
    order_status,
    locked_by_cashier_id,
    fulfillment_type,
    order_items(quantity, product_id, products(name, retail_price, image_url))
 `)
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

  // 2. Get price_per_km and shop coords + shop info
  const { data: shopSettings } = await supabase
 .from('shop_settings')
 .select('price_per_km, shop_lat, shop_lng')
 .eq('shop_id', order.shop_id)
 .single()

  const { data: shopInfo } = await supabase
 .from('shops')
 .select('name, logo_url, tin_number, location')
 .eq('id', order.shop_id)
 .single()

  let delivery_fee = 0
  if (shopSettings && order.customer_lat && order.customer_lng && shopSettings.shop_lat && shopSettings.shop_lng) {
    const toRad = (x: number) => x * Math.PI / 180
    const R = 6371 // km
    const dLat = toRad(order.customer_lat - shopSettings.shop_lat)
    const dLon = toRad(order.customer_lng - shopSettings.shop_lng)
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRad(shopSettings.shop_lat)) * Math.cos(toRad(order.customer_lat)) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    delivery_fee = Math.round(distance * shopSettings.price_per_km)
  }

  // 3. Calculate items total and format for Receipt component
  let items_total = 0
  const receiptItems = (order.order_items as any[]).map(item => {
    const price = item.products?.retail_price || 0
    const qty = item.quantity
    const total = price * qty
    items_total += total
    return {
      name: item.products?.name || 'Item',
      qty,
      price,
      total
    }
  })
  const total_cost = items_total + delivery_fee

  // 4. Decrement stock
  for (const item of (order.order_items as any[])) {
    if (!item.product_id) continue

    const { error: stockError } = await supabase.rpc('decrement_stock', {
      p_id: item.product_id,
      qty: item.quantity
    })

    if (stockError) {
      console.error('Stock update failed:', stockError)
      return { success: false, error: `Not enough stock` }
    }
  }

  // 5. Update order as delivered + save fees
  const { error: updateError } = await supabase
.from('orders')
.update({
      order_status: 'delivered',
      delivered_at: new Date().toISOString(),
      delivery_fee: delivery_fee,
      total_cost: total_cost
    })
.eq('id', orderId)

  if (updateError) {
    console.error('COMPLETE ORDER ERROR:', updateError)
    return { success: false, error: 'Failed to update order status: ' + updateError.message }
  }

  revalidatePath('/dashboard/staff/orders')
  revalidatePath('/dashboard/inventory')

  // 6. RETURN DATA FOR AUTO RECEIPT
  const receiptData = {
    receipt_number: `INV-${order.id.slice(0,8).toUpperCase()}`,
    created_at: order.created_at,
    items: receiptItems,
    total: total_cost,
    delivery_fee: delivery_fee,
    fulfillment_type: order.fulfillment_type || 'delivery',
    customer_phone: order.customer_whatsapp,
    cashier_name: user.user_metadata?.full_name || user.email,
    google_maps_link: order.google_maps_link
  }

  const shopData = {
    name: shopInfo?.name || 'My Shop',
    logo_url: shopInfo?.logo_url,
    tin_number: shopInfo?.tin_number,
    location: shopInfo?.location
  }

  return { success: true, order: receiptData, shop: shopData }
}
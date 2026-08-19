import { createClient } from '@/app/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await request.json()

    const {
      shop_id,
      user_id,
      name,
      phone,
      location,
      payment_method,
      transaction_id,
      items,
      items_total,
      delivery_fee,
      total,
      cash_received,
      change_given,
      customer_lat,
      customer_lng,
      google_maps_link,
      fulfillment_type,
      distance_km,
      price_per_km_used
    } = body

    if (!shop_id || !user_id || !name || !phone || !items?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: shop_id, user_id, name, phone, items' },
        { status: 400 }
      )
    }

    const finalFulfillmentType = fulfillment_type || 'delivery'
    const cleanPaymentMethod = payment_method?.toString().trim() || 'Cash'

    if(finalFulfillmentType === 'delivery' && !customer_lat) {
      return NextResponse.json({ error: 'Delivery location required' }, { status: 400 })
    }

    // FIX 1: Send id + image_url to DB function
    const itemsForDB = items.map((item: any) => ({
      id: item.id, // KEY
      name: item.name,
      qty: item.qty,
      price: Number(item.price),
      image_url: item.image_url || item.image || null // KEY
    }))

    const itemCount = items.reduce((sum: number, item: any) => sum + Number(item.qty), 0)
    const calcItemsTotal = Number(items_total) || items.reduce((s: number, i: any) => s + Number(i.price) * Number(i.qty), 0)
    const calcDeliveryFee = Number(delivery_fee) || 0
    const calcTotal = Number(total) || calcItemsTotal + calcDeliveryFee

    // FIX 2: Call correct function name + send all params
    const { data: rpcData, error: rpcError } = await supabase.rpc('create_pos', {
      p_shop_id: shop_id,
      p_user_id: user_id,              
      p_cashier_id: null, // public store has no cashier yet
      p_cashier_name: null,
      p_items: itemsForDB,
      p_payment_method: cleanPaymentMethod,
      p_transaction_id: transaction_id || null,
      p_cash_received: Number(cash_received) || 0,
      p_fulfillment_type: finalFulfillmentType,
      p_customer_lat: customer_lat || null,
      p_customer_lng: customer_lng || null,
      p_google_maps_link: google_maps_link || null,
      p_customer_whatsapp: phone || null,
      p_customer_name: name,           
      p_customer_phone: phone,
      p_items_total: calcItemsTotal, // KEY
      p_delivery_fee: calcDeliveryFee, // KEY
      p_total: calcTotal // KEY
    })

    if (rpcError) {
      console.error('--- RPC ERROR ---', rpcError)
      return NextResponse.json({ error: rpcError.message }, { status: 500 })
    }

    const orderId = rpcData.order_id

    // FIX 3: Update with correct fields
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        customer_name: name,
        delivery_address: location || null,
        items_total: calcItemsTotal, // CHANGED from subtotal
        total: calcTotal,
        total_amount: calcTotal, // for compatibility
        delivery_fee: calcDeliveryFee,
        item_count: itemCount,
        transaction_id: transaction_id || null,
        change_given: change_given || null,
        distance_km: distance_km || 0,
        price_per_km_used: price_per_km_used || 0,
        order_status: 'pending',
        items: itemsForDB // save with images
      })
      .eq('id', orderId)

    if (updateError) console.error('--- UPDATE ERROR ---', updateError)

    console.log('Order created:', orderId)
    revalidatePath('/dashboard/staff/orders')
    revalidatePath('/orders')
    
    return NextResponse.json({ 
      success: true, 
      order: { id: orderId, order_number: rpcData.order_number } 
    })

  } catch (err: any) {
    console.error('--- CATCH ERROR ---', err.message)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
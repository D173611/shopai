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
      subtotal,
      total,
      cash_received,
      change_given,
      items_total,
      delivery_fee,
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

    const finalFulfillmentType = fulfillment_type || 'shop'
    const cleanPaymentMethod = payment_method?.toString().trim() || 'Cash'

    console.log('--- ORDER DEBUG ---')
    console.log('Payment method:', cleanPaymentMethod)
    console.log('Fulfillment:', finalFulfillmentType)

    if (finalFulfillmentType !== 'pos' && !cleanPaymentMethod) {
      return NextResponse.json({ error: 'Payment method is required' }, { status: 400 })
    }

    if(finalFulfillmentType === 'delivery' && !customer_lat) {
      return NextResponse.json({ error: 'Delivery location required' }, { status: 400 })
    }

    const itemsForDB = items.map((item: any) => ({
      name: item.name,
      qty: item.qty,
      price: Number(item.price),
      total: Number(item.price) * Number(item.qty)
    }))

    // FIXED: Added p_user_id, p_customer_name, p_customer_phone to match the 15-param function
    const { data: rpcData, error: rpcError } = await supabase.rpc('create_pos_order', {
      p_items: itemsForDB,
      p_payment_method: cleanPaymentMethod,
      p_cashier_id: user_id,
      p_cashier_name: name,
      p_cash_received: Number(cash_received) || 0,
      p_shop_id: shop_id,
      p_delivery_fee: Number(delivery_fee) || 0,
      p_customer_lat: customer_lat || null,
      p_customer_lng: customer_lng || null,
      p_google_maps_link: google_maps_link || null,
      p_fulfillment_type: finalFulfillmentType,
      p_customer_whatsapp: phone || null,
      p_user_id: user_id,              // NEW
      p_customer_name: name,           // NEW
      p_customer_phone: phone          // NEW
    })

    if (rpcError) {
      console.error('--- RPC ERROR ---', rpcError)
      return NextResponse.json({ error: rpcError.message }, { status: 500 })
    }

    const orderId = rpcData.order_id

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        customer_name: name,
        delivery_address: location || null,
        subtotal: items_total || subtotal || null,
        transaction_id: transaction_id || null,
        change_given: change_given || null,
        distance_km: distance_km || 0,
        price_per_km_used: price_per_km_used || 0,
        order_status: 'pending',
        items: items.map((item: any) => ({
          product_id: item.id,
          product_name: item.name,
          quantity: item.qty,
          price: item.price,
          image_url: item.image_url || null
        }))
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
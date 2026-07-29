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
      tax_amount,
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

    if (!name || !phone || !items?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: name, phone, items' },
        { status: 400 }
      )
    }

    const finalFulfillmentType = fulfillment_type || 'pos' // <-- KEY FIX
    const cleanPaymentMethod = payment_method?.toString().trim() || 'Cash' // default to Cash for POS

    console.log('--- ORDER DEBUG ---')
    console.log('Payment method:', cleanPaymentMethod)
    console.log('Fulfillment:', finalFulfillmentType)

    // ONLY REQUIRE PAYMENT FOR STORE/DELIVERY
    if (finalFulfillmentType !== 'pos' && !cleanPaymentMethod) {
      return NextResponse.json(
        { error: 'Payment method is required' },
        { status: 400 }
      )
    }

    // ONLY REQUIRE LOCATION FOR DELIVERY
    if(finalFulfillmentType === 'delivery' && !customer_lat) {
      return NextResponse.json(
        { error: 'Delivery location required' },
        { status: 400 }
      )
    }

    const orderItems = items.map((item: any) => ({
      product_id: item.id,
      product_name: item.name,
      quantity: item.qty,
      price: item.price,
      image_url: item.image_url || null
    }))

    const payload = {
      shop_id: shop_id || null,
      user_id: user_id || null,
      customer_name: name,
      customer_whatsapp: phone,
      delivery_address: location || null,
      subtotal: items_total || subtotal || null,
      tax_amount: tax_amount || null,
      total_amount: total,
      delivery_fee: delivery_fee || 0,
      order_status: 'pending',
      locked_by_cashier_id: null,
      locked_at: null,
      cancelled_by: null,
      cancelled_at: null,
      payment_method: cleanPaymentMethod,
      transaction_id: transaction_id || null,
      cash_received: cash_received || null,
      change_given: change_given || null,
      items: orderItems,
      
      customer_lat: customer_lat || null,
      customer_lng: customer_lng || null,
      google_maps_link: google_maps_link || null,
      fulfillment_type: finalFulfillmentType, // <-- 'pos' for POS
      distance_km: distance_km || 0,
      price_per_km_used: price_per_km_used || 0
    }

    const { data, error } = await supabase
      .from('orders')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('--- SUPABASE ERROR ---', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log('Order created:', data.id)
    revalidatePath('/dashboard/staff/orders')
    revalidatePath('/orders')
    return NextResponse.json({ success: true, order: data })

  } catch (err: any) {
    console.error('--- CATCH ERROR ---', err.message)
    return NextResponse.json(
      { error: err.message || 'Server error' },
      { status: 500 }
    )
  }
}
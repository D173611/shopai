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
      change_given
    } = body

    if (!name || !phone || !location || !items?.length) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Accept ANY payment method - just clean it up
    const cleanPaymentMethod = payment_method?.toString().trim()

    if (!cleanPaymentMethod) {
      return NextResponse.json(
        { error: 'Payment method is required' },
        { status: 400 }
      )
    }

    console.log('--- ORDER DEBUG ---')
    console.log('Payment method received:', payment_method)
    console.log('Payment method saved:', cleanPaymentMethod)

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
      delivery_address: location,
      subtotal: subtotal || null,
      tax_amount: tax_amount || null,
      total_amount: total,
      order_status: 'pending',
      locked_by_cashier_id: null,
      locked_at: null,
      cancelled_by: null,
      cancelled_at: null,
      payment_method: cleanPaymentMethod, // Saves "Airtel Money", "MTN MoMo", whatever
      transaction_id: transaction_id || null,
      cash_received: cash_received || null,
      change_given: change_given || null,
      items: orderItems
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
import Receipt from '@/app/components/Receipt'
import { createClient } from '@/app/utils/supabase/server'
import { notFound } from 'next/navigation'

type Shop = {
  name: string | null
  logo_url: string | null
  tin_number: string | null
  location: string | null
}

type FulfillmentType = 'shop' | 'delivery'

export default async function ReceiptPage({
  params
}: {
  params: Promise<{ id: string }> // CHANGED 1: params is now a Promise
}) {
  const { id } = await params // CHANGED 2: await the params

  const supabase = await createClient()

  const { data: order, error } = await supabase
  .from('orders')
  .select(`
     id,
     order_number,
     total_cost,
     items_total,
     delivery_fee,
     fulfillment_type,
     created_at,
     status,
     customer_whatsapp,
     cashier_name,
     google_maps_link,
     items,
     shops!inner(name, logo_url, tin_number, location)
   `)
  .eq('id', id) // CHANGED 3: use id instead of params.id
  .single()

  if (error ||!order) return notFound()

  const items = Array.isArray(order.items)? order.items : []

  // FIX: Cast fulfillment_type properly
  const ft: FulfillmentType = order.fulfillment_type === 'delivery'? 'delivery' : 'shop'

  const mappedOrder = {
    receipt_number: order.order_number,
    created_at: order.created_at,
    items: items.map((i: any) => ({
      name: i.product_name || i.name,
      qty: i.quantity || i.qty,
      price: Number(i.unit_price || i.price),
      total: Number(i.total_price || i.total)
    })),
    total: Number(order.total_cost),
    delivery_fee: Number(order.delivery_fee || 0),
    fulfillment_type: ft, // now typed correctly
    customer_phone: order.customer_whatsapp || undefined,
    cashier_name: order.cashier_name || undefined,
    google_maps_link: order.google_maps_link || undefined
  }

  // Handle if shops comes as array or object
  const rawShop = order.shops
  const shopArray = Array.isArray(rawShop)? rawShop : [rawShop]
  const s: Shop = shopArray[0]

  const shop = {
    name: s?.name?? 'Shop',
    logo_url: s?.logo_url?? null,
    tin_number: s?.tin_number?? null,
    location: s?.location?? null,
  }

  return <Receipt shop={shop} order={mappedOrder} />
}
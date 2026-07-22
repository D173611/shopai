import { createClient } from '../../../utils/supabase/server'
import { redirect } from 'next/navigation'
import OrdersClient from './OrdersClient' // <-- MUST MATCH FILENAME EXACTLY

export default async function OrdersPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const { data: orders, error } = await supabase
  .from('orders')
  .select(`
      *,
      order_items (
        *,
        products (name, image_url, retail_price)
      )
    `)
  .order('created_at', { ascending: false })
  .limit(100)

  if (error) {
    return (
      <div className="min-h-screen p-6">
        <div className="bg-rose-500/20 backdrop-blur-xl border border-rose-400/30 text-white p-4 rounded-xl">
          DB Error: {error.message}
        </div>
      </div>
    )
  }

  return <OrdersClient initialOrders={orders?? []} user={user} />
}
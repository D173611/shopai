import { createClient } from '../../../utils/supabase/server'
import { redirect } from 'next/navigation'
import OrdersClient from './OrdersClient'

export default async function OrdersPage() {
  const supabase = await createClient()

  const { data, error: authError } = await supabase.auth.getUser()
  const user = data?.user
  if (authError || !user) return redirect('/login')

  // 1. Get cashier's shop_id first
  const { data: staffMember } = await supabase
    .from('staff_members')
    .select('shop_id')
    .eq('user_id', user.id)
    .eq('role', 'cashier')
    .maybeSingle()

  if (!staffMember?.shop_id) {
    return <div className="p-6">You are not assigned to a shop</div>
  }

  // 2. Only fetch orders for this shop
  const { data: orders, error } = await supabase
  .from('orders')
  .select(`
      *,
      order_items (
        *,
        products (name, image_url, retail_price)
      )
    `)
  .eq('shop_id', staffMember.shop_id) // ADDED THIS FILTER
  .order('created_at', { ascending: false })
  .limit(100)

  if (error) {
    return (
      <div className="min-h-screen p-6">
        <div className="bg-rose-500/20 backdrop-blur-xl border-rose-400/30 text-white p-4 rounded-xl">
          DB Error: {error.message}
        </div>
      </div>
    )
  }

  return <OrdersClient initialOrders={orders?? []} user={user} />
}
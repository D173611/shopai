import { createClient } from '../../../utils/supabase/server'
import { redirect } from 'next/navigation'
import OrdersClient from './OrdersClient'

export default async function OrdersPage() {
  const supabase = await createClient()

  const { data, error: authError } = await supabase.auth.getUser()
  const user = data?.user
  if (authError || !user) return redirect('/login')

  // DEBUG LOG
  console.log("LOGGED IN USER ID:", user.id)

  const { data: staffMember, error: staffError } = await supabase
    .from('staff_members')
    .select('shop_id, role')
    .eq('user_id', user.id)
    .in('role', ['admin', 'owner', 'cashier', 'manager']) // <-- only line changed
    .maybeSingle()

  console.log("STAFF QUERY RESULT:", staffMember) // ADD THIS
  console.log("STAFF QUERY ERROR:", staffError) // ADD THIS

  if (!staffMember?.shop_id) {
    return <div className="p-6">You are not assigned to a shop. UserID: {user.id}</div>
  }

  const { data: orders, error } = await supabase
  .from('orders')
  .select(`*, order_items (*, products (name, image_url, retail_price))`)
  .eq('shop_id', staffMember.shop_id) 
  .order('created_at', { ascending: false })
  .limit(100)

  if (error) return <div>DB Error: {error.message}</div>
  return <OrdersClient initialOrders={orders ?? []} user={user} />
}
import { createClient } from '../../utils/supabase/server'
import { redirect } from 'next/navigation'
import SalesClient from './SalesClient'

interface Props {
  searchParams: Promise<{ filter?: string; branch?: string }>
}

export default async function SalesLedgerPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { filter, branch } = await searchParams

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
  if (!shop) return redirect('/signup?error=No shop found')

  const { data: allBranches } = await supabase.from('branches').select('id, name').eq('shop_id', shop.id)

  let query = supabase.from('orders')
  .select('*')
  .eq('shop_id', shop.id)
  .eq('deleted', false)

  if (branch && branch!== 'all') {
    query = query.eq('branch_id', branch)
  }

  // FIX: Use UTC dates to match Supabase
  const now = new Date()
  if (filter === 'daily') {
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
    query = query.gte('created_at', startOfToday)
  } else if (filter === 'weekly') {
    const oneWeekAgo = new Date(now)
    oneWeekAgo.setUTCDate(oneWeekAgo.getUTCDate() - 7)
    oneWeekAgo.setUTCHours(0, 0, 0, 0)
    query = query.gte('created_at', oneWeekAgo.toISOString())
  } else if (filter === 'monthly') {
    const oneMonthAgo = new Date(now)
    oneMonthAgo.setUTCMonth(oneMonthAgo.getUTCMonth() - 1)
    oneMonthAgo.setUTCHours(0, 0, 0, 0)
    query = query.gte('created_at', oneMonthAgo.toISOString())
  } else if (filter === 'yearly') {
    const oneYearAgo = new Date(now)
    oneYearAgo.setUTCFullYear(oneYearAgo.getUTCFullYear() - 1)
    oneYearAgo.setUTCHours(0, 0, 0, 0)
    query = query.gte('created_at', oneYearAgo.toISOString())
  }

  const { data: orders } = await query.order('created_at', { ascending: false })

  // FIX: Select ALL fields so getOrderTotal can find your price field
  const { data: allOrders } = await supabase.from('orders')
  .select('*') // Changed from .select('total, amount, gross_price, created_at')
  .eq('shop_id', shop.id)
  .eq('deleted', false)

  return (
    <SalesClient 
      orders={orders || []} 
      allOrders={allOrders || []}
      branches={allBranches || []}
      shopId={shop.id}
      filter={filter || 'all'}
      selectedBranch={branch || 'all'}
    />
  )
}
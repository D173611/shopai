import { createClient } from '@/app/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { shopId, filter, branch } = await request.json()

  const { data: shop } = await supabase.from('shops').select('id').eq('id', shopId).eq('owner_id', user.id).single()
  if (!shop) return NextResponse.json({ error: 'Shop not found' }, { status: 404 })

  let query = supabase.from('orders').update({ deleted: true }).eq('shop_id', shopId).eq('deleted', false)

  if (branch && branch!== 'all') {
    query = query.eq('branch_id', branch)
  }

  if (filter === 'daily') {
    const startOfToday = new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
    query = query.gte('created_at', startOfToday)
  } else if (filter === 'weekly') {
    const oneWeekAgo = new Date(new Date().setDate(new Date().getDate() - 7)).toISOString()
    query = query.gte('created_at', oneWeekAgo)
  } else if (filter === 'monthly') {
    const oneMonthAgo = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString()
    query = query.gte('created_at', oneMonthAgo)
  } else if (filter === 'yearly') {
    const oneYearAgo = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString()
    query = query.gte('created_at', oneYearAgo)
  }

  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
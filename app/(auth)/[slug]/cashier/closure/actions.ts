'use server'

import { createClient } from '../../../../utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

type Order = {
  total_amount: number | string
  payment_method: string | null
}

export async function submitDualTillClosure(slug: string, shopId: string, formData: FormData) {
  const supabase = await createClient()

  const cashierName = formData.get('cashierName') as string
  const countedCash = parseFloat(formData.get('countedCash') as string) || 0
  const countedMomo = parseFloat(formData.get('countedMomo') as string) || 0
  const notes = formData.get('notes') as string

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString()
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString()

  const { data: todayOrders, error: ordersError } = await supabase
    .from('orders')
    .select('total_amount, payment_method')
    .eq('shop_id', shopId)
    .eq('status', 'completed')
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)

  if (ordersError) {
    return redirect(`/${slug}/cashier/closure?error=${encodeURIComponent('Failed to fetch sales data')}`)
  }

  const orders = todayOrders as Order[] | null

  const expectedCashSales = orders
    ?.filter((o: Order) => o.payment_method === 'cash')
    .reduce((sum: number, o: Order) => sum + Number(o.total_amount), 0) || 0

  const expectedMomoSales = orders
    ?.filter((o: Order) => o.payment_method === 'momo' || o.payment_method === 'mobile_money')
    .reduce((sum: number, o: Order) => sum + Number(o.total_amount), 0) || 0

  const varianceCash = countedCash - expectedCashSales
  const varianceMomo = countedMomo - expectedMomoSales

  const { error } = await supabase.from('shift_closures').insert({
    shop_id: shopId,
    cashier_name: cashierName,
    expected_cash: expectedCashSales,
    counted_cash: countedCash,
    expected_momo: expectedMomoSales,
    counted_momo: countedMomo,
    variance_cash: varianceCash,
    variance_momo: varianceMomo,
    notes: notes,
    closed_at: new Date().toISOString()
  })

  if (error) {
    return redirect(`/${slug}/cashier/closure?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/dashboard')
  revalidatePath(`/${slug}/cashier/orders`)
  return redirect(`/${slug}/cashier/closure?success=true`)
}
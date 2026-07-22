import { submitDualTillClosure } from './actions'
import { createClient } from '../../../../utils/supabase/server'

type Params = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ success?: string; error?: string }>
}

type Order = {
  total_amount: number | string
  payment_method: string | null
}

export default async function ClosurePage({ params, searchParams }: Params) {
  const { slug } = await params
  const { success, error } = await searchParams
  const supabase = await createClient()

  // Get shop
  const { data: shop } = await supabase
   .from('shops')
   .select('id')
   .eq('slug', slug)
   .single()

  if (!shop) return <div>Shop not found</div>

  // Calculate expected totals - same logic as action
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString()
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString()

  const { data: todayOrders } = await supabase
   .from('orders')
   .select('total_amount, payment_method')
   .eq('shop_id', shop.id)
   .eq('status', 'completed')
   .gte('created_at', startOfDay)
   .lte('created_at', endOfDay)

  const orders = todayOrders as Order[] | null

  const expectedCash = orders
   ?.filter((o: Order) => o.payment_method === 'cash')
   .reduce((sum: number, o: Order) => sum + Number(o.total_amount), 0) || 0

  const expectedMomo = orders
   ?.filter((o: Order) => o.payment_method === 'momo' || o.payment_method === 'mobile_money')
   .reduce((sum: number, o: Order) => sum + Number(o.total_amount), 0) || 0

  // Bind shopId and slug to the server action
  const submitClosureWithShop = submitDualTillClosure.bind(null, slug, shop.id)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6">
        <h1 className="text-2xl font-black text-center">Shift Closure</h1>

        {error && <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 text-xs rounded-xl">⚠️ {error}</div>}

        {success === 'true'? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl text-center">
            <p className="text-emerald-400 font-bold">🎉 Shift Closed Successfully!</p>
            <a href={`/${slug}/cashier/orders`} className="inline-block mt-4 bg-slate-800 px-5 py-2 rounded-xl text-xs">Back to POS</a>
          </div>
        ) : (
          <form action={submitClosureWithShop} className="space-y-4">
            <div className="grid grid-cols-2 gap-3 bg-slate-950 p-4 rounded-xl">
              <div>
                <span className="text-[10px] text-slate-500 uppercase">Expected Cash</span>
                <span className="text-base font-black font-mono block">UGX {expectedCash.toLocaleString()}</span>
              </div>
              <div className="border-l border-slate-800 pl-3">
                <span className="text-[10px] text-slate-500 uppercase">Expected MoMo</span>
                <span className="text-base font-black font-mono block text-blue-400">UGX {expectedMomo.toLocaleString()}</span>
              </div>
            </div>

            <input name="cashierName" required placeholder="Cashier name" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs" />
            <input name="countedCash" type="number" required placeholder="Actual cash counted" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono" />
            <input name="countedMomo" type="number" required placeholder="Actual MoMo float" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono" />
            <textarea name="notes" placeholder="Notes..." className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs min-h-[60px]" />

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3.5 rounded-xl text-xs uppercase">
              Submit Closure
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
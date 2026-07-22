import { createClient } from '../../utils/supabase/server'
import { redirect } from 'next/navigation'

type CashierLog = {
  cashier_id: string
  cashier_name: string | null
  cashier_email: string | null
  branch_name: string | null
  total_revenue_generated: number | string | null
  total_transactions_processed: number | string | null
}

export default async function CashierAnalyticsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const { data: shop, error: shopError } = await supabase
   .from('shops')
   .select('id')
   .eq('owner_id', user.id)
   .maybeSingle()

  if (shopError || !shop) {
    console.error('Shop fetch failed:', shopError)
    return redirect('/signup?error=Create a shop first')
  }

  // Fix: Tell TS exactly what this returns
  const { data: performanceLogs, error: logsError } = await supabase
   .from('cashier_performance_tracker')
   .select('*')
   .eq('shop_id', shop.id)
   .order('total_revenue_generated', { ascending: false })
   .returns<CashierLog[]>()

  if (logsError) console.error('Performance logs failed:', logsError)

  // Now safe because performanceLogs is CashierLog[] | null
  const logs = performanceLogs ?? []

  return (
    <div className="min-h-screen bg-slate-100 p-6 space-y-6">
      <header className="bg-white p-6 rounded-2xl border shadow-xs">
        <h1 className="text-2xl font-black text-slate-800">📊 Cashier Performance & Productivity Matrix</h1>
        <p className="text-xs text-slate-500 mt-1">Real-time automated employee audit logs tracking transaction volumes and branch sales leadership.</p>
      </header>

      <div className="bg-white p-6 rounded-2xl border shadow-sm">
        <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-4">🏆 Employee Sales Leaderboard</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b text-slate-400 text-xs font-bold uppercase tracking-wider pb-2">
                <th className="pb-3">Rank & Cashier Name</th>
                <th className="pb-3">Assigned Branch Node</th>
                <th className="pb-3 text-center">Transactions Processed</th>
                <th className="pb-3 text-right">Gross Generated Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {logs.length > 0 ? (
                logs.map((staff, index) => {
                  const revenueGenerated = Number(staff.total_revenue_generated) || 0
                  const txCount = Number(staff.total_transactions_processed) || 0
                  
                  return (
                    <tr key={staff.cashier_id || index} className="hover:bg-slate-50 transition">
                      <td className="py-4 flex items-center space-x-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                          index === 0 ? 'bg-amber-500 text-white shadow-md' : 
                          index === 1 ? 'bg-slate-300 text-slate-800' : 
                          index === 2 ? 'bg-amber-700 text-white' : 
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {index + 1}
                        </span>
                        <div>
                          <span className="font-extrabold text-slate-800 block text-sm">
                            {staff.cashier_name || 'Unknown'}
                          </span>
                          <span className="text-xs text-slate-400 font-mono block">
                            {staff.cashier_email || '—'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 font-semibold text-slate-600">
                        {staff.branch_name || 'Main Warehouse HQ'}
                      </td>
                      <td className="py-4 text-center font-mono font-bold text-slate-700">
                        {txCount} sales
                      </td>
                      <td className="py-4 text-right font-black text-indigo-600 font-mono text-base">
                        UGX {revenueGenerated.toLocaleString('en-US')}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                    No cashier sales log entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
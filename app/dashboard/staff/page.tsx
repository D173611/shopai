import { createClient } from '@/app/utils/supabase/server'
import { redirect } from 'next/navigation'
import { handleRegisterCashier, toggleCashierStatus, deleteCashier, changeCashierPassword } from './actions'

type CashierPerformance = {
  cashier_id: string
  cashier_name: string | null
  cashier_email: string | null
  branch_name: string | null
  branch_id: string | null
  is_active: boolean
  total_revenue_generated: number
  total_transactions_processed: number
  revenue_today: number
  revenue_week: number
  revenue_month: number
  tx_today: number
  tx_week: number
  tx_month: number
}

type Branch = {
  id: string
  name: string
}

export default async function CashierAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const { data: shop, error: shopError } = await supabase
    .from('shops')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (shopError || !shop) {
    return redirect('/signup?error=Create a shop first')
  }

  const { data: fetchedBranches } = await supabase
    .from('branches')
    .select('id, name')
    .eq('shop_id', shop.id)
    .order('name')

  const branches: Branch[] = fetchedBranches ?? []

  const { data: performanceLogs, error: perfError } = await supabase
    .from('cashier_performance_tracker')
    .select('*')
    .eq('shop_id', shop.id)
    .order('cashier_name', { ascending: true })

  const logs: CashierPerformance[] = (performanceLogs ?? []).map((c: any) => ({
    cashier_id: c.cashier_id,
    cashier_name: c.cashier_name,
    cashier_email: c.cashier_email,
    branch_name: c.branch_name,
    branch_id: c.branch_id,
    is_active: c.is_active ?? true,
    total_revenue_generated: Number(c.total_revenue_generated) || 0,
    total_transactions_processed: Number(c.total_transactions_processed) || 0,
    revenue_today: Number(c.revenue_today) || 0,
    revenue_week: Number(c.revenue_week) || 0,
    revenue_month: Number(c.revenue_month) || 0,
    tx_today: Number(c.tx_today) || 0,
    tx_week: Number(c.tx_week) || 0,
    tx_month: Number(c.tx_month) || 0,
  }))

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-6">
      <header className="bg-slate-900/40 backdrop-blur-2xl p-6 rounded-2xl border border-slate-700/30 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100">👥 Staff Management & Performance</h1>
          <p className="text-xs text-slate-300 mt-1">Cashiers log in with Name + PIN</p>
        </div>
        <a href="/dashboard" className="bg-slate-800/60 hover:bg-slate-700/60 text-white px-4 py-2 rounded-xl text-sm font-bold transition border border-slate-700/30">
          ← Back to Dashboard
        </a>
      </header>

      {params.error && (
        <div className="bg-rose-500/20 border border-rose-500/40 text-rose-300 p-4 rounded-xl text-sm font-bold backdrop-blur-xl">
          ❌ Error: {decodeURIComponent(params.error)}
        </div>
      )}
      {params.success && (
        <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 p-4 rounded-xl text-sm font-bold backdrop-blur-xl">
          ✅ {decodeURIComponent(params.success)}
        </div>
      )}

      <div className="bg-slate-900/40 backdrop-blur-2xl p-6 rounded-2xl border border-slate-700/30 shadow-2xl">
        <h2 className="font-bold text-slate-100 text-sm uppercase tracking-wider mb-4">🆕 Onboard New Store Cashier</h2>
        <form action={handleRegisterCashier} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Full Name - Used for Login</label>
              <input type="text" name="name" required placeholder="e.g. John Mukasa" className="w-full text-sm bg-slate-950/40 border border-slate-700/30 p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder:text-slate-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Login PIN</label>
              <input type="password" name="pin" required placeholder="4-Digit Secure PIN" minLength={4} maxLength={6} className="w-full text-sm bg-slate-950/40 border border-slate-700/30 p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono tracking-widest text-white placeholder:text-slate-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Assigned Branch</label>
              <select name="branchId" className="w-full text-sm bg-slate-950/40 border border-slate-700/30 p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white">
                <option value="">Main Warehouse HQ</option>
                {branches.map((b: Branch) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" className="w-full bg-slate-800/60 hover:bg-slate-700/60 text-white font-bold py-3.5 px-4 rounded-xl text-sm uppercase tracking-wider transition border border-slate-700/30">
            Create Cashier Login 🔒
          </button>
        </form>
      </div>

      <div className="bg-slate-900/40 backdrop-blur-2xl p-6 rounded-2xl border border-slate-700/30 shadow-2xl">
        <h2 className="font-bold text-slate-100 text-sm uppercase tracking-wider mb-4">
          🔧 Manage Cashier Accounts ({logs.length})
        </h2>

        {perfError && (
          <div className="bg-rose-500/20 border border-rose-500/40 text-rose-300 p-3 rounded-xl text-xs mb-4">
            DB Error loading cashiers: {perfError.message}
          </div>
        )}

        {logs.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-700/30 rounded-2xl bg-slate-950/20">
            <span className="text-3xl block mb-2">👥</span>
            <h4 className="text-sm font-extrabold text-slate-200">No Cashiers Yet</h4>
            <p className="text-xs text-slate-400 mt-1">Add your first cashier using the form above</p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((cashier: CashierPerformance, index: number) => {
              return (
                <div key={cashier.cashier_id || index} className="border border-slate-700/30 bg-slate-950/20 p-5 rounded-xl space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-base bg-indigo-500/30 text-indigo-300">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-slate-100 font-bold text-base">{cashier.cashier_name || 'Unknown'}</p>
                        <p className="text-xs text-slate-400 font-mono">Login: {cashier.cashier_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-400 font-semibold">📍 {cashier.branch_name || 'Main Warehouse HQ'}</span>
                          {!cashier.is_active && <span className="text-xs bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded font-bold">LOCKED</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-700/30">
                    <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-700/30">
                      <span className="text-xs text-slate-400 font-bold uppercase block">Today</span>
                      <p className="text-sm font-black text-slate-100 font-mono mt-1">UGX {cashier.revenue_today.toLocaleString()}</p>
                      <p className="text-xs text-slate-400">{cashier.tx_today} tx</p>
                    </div>
                    <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-700/30">
                      <span className="text-xs text-slate-400 font-bold uppercase block">This Week</span>
                      <p className="text-sm font-black text-slate-100 font-mono mt-1">UGX {cashier.revenue_week.toLocaleString()}</p>
                      <p className="text-xs text-slate-400">{cashier.tx_week} tx</p>
                    </div>
                    <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-700/30">
                      <span className="text-xs text-slate-400 font-bold uppercase block">This Month</span>
                      <p className="text-sm font-black text-slate-100 font-mono mt-1">UGX {cashier.revenue_month.toLocaleString()}</p>
                      <p className="text-xs text-slate-400">{cashier.tx_month} tx</p>
                    </div>
                    <div className="bg-indigo-900/30 p-3 rounded-lg border border-indigo-700/30">
                      <span className="text-xs text-indigo-300 font-bold uppercase block">All Time</span>
                      <p className="text-sm font-black text-indigo-200 font-mono mt-1">UGX {cashier.total_revenue_generated.toLocaleString()}</p>
                      <p className="text-xs text-indigo-400">{cashier.total_transactions_processed} tx</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-700/30">
                    <form action={toggleCashierStatus}>
                      <input type="hidden" name="id" value={cashier.cashier_id} />
                      <input type="hidden" name="currentStatus" value={String(cashier.is_active)} />
                      <button type="submit" className={`px-4 py-2 rounded-lg text-xs font-bold transition ${cashier.is_active ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}>
                        {cashier.is_active ? '🔒 Lock Account' : '🔓 Unlock Account'}
                      </button>
                    </form>

                    <form action={changeCashierPassword} className="flex gap-2">
                      <input type="hidden" name="id" value={cashier.cashier_id} />
                      <input 
                        type="password" 
                        name="newPassword" 
                        placeholder="New PIN" 
                        required 
                        minLength={4} 
                        maxLength={6}
                        className="w-24 px-3 py-2 border border-slate-700/30 rounded-lg text-xs bg-slate-900/40 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder:text-slate-500" 
                      />
                      <button type="submit" className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-500 hover:bg-blue-600 text-white transition">
                        🔑 Change PIN
                      </button>
                    </form>

                    <form action={deleteCashier}>
                      <input type="hidden" name="id" value={cashier.cashier_id} />
                      <button type="submit" className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white transition">
                        🗑️ Delete
                      </button>
                    </form>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
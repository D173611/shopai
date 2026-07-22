'use client'
import { useRouter } from 'next/navigation'
import DeleteSalesButton from './DeleteSalesButton'
import DownloadPDFButton from './DownloadPDFButton'

type Props = {
  orders: any[]
  allOrders: any[]
  branches: any[]
  shopId: string
  filter: string
  selectedBranch: string
}

export default function SalesClient({ orders, allOrders, branches, shopId, filter, selectedBranch }: Props) {
  const router = useRouter()
  const branchMap = new Map(branches.map(b => [b.id, b.name]))

  const getOrderTotal = (order: any): number => {
    const possibleFields = [
      'total',
      'amount',
      'gross_price',
      'subtotal',
      'total_amount',
      'grand_total',
      'price',
      'value',
      'cost'
    ]

    for (const field of possibleFields) {
      if (order[field]!== undefined && order[field]!== null) {
        const val = String(order[field]).replace(/,/g, '')
        const num = Number(val)
        if (!isNaN(num) && num > 0) return num
      }
    }

    if (order.line_items && Array.isArray(order.line_items)) {
      return order.line_items.reduce((sum: number, item: any) => {
        const price = Number(item.price || item.unit_price || item.amount || 0)
        const qty = Number(item.quantity || item.qty || 1)
        return sum + (price * qty)
      }, 0)
    }

    if (order.items && Array.isArray(order.items)) {
      return order.items.reduce((sum: number, item: any) => {
        const price = Number(item.price || item.unit_price || item.amount || 0)
        const qty = Number(item.quantity || item.qty || 1)
        return sum + (price * qty)
      }, 0)
    }

    return 0
  }

  const periodTotalRevenue = orders.reduce((sum, o) => sum + getOrderTotal(o), 0)

  // FIX: Use UTC dates to match Supabase timestamps
  const now = new Date()
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).getTime()

  const weekAgo = new Date()
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7)
  weekAgo.setUTCHours(0, 0, 0, 0)
  const weekAgoTime = weekAgo.getTime()

  const monthAgo = new Date()
  monthAgo.setUTCMonth(monthAgo.getUTCMonth() - 1)
  monthAgo.setUTCHours(0, 0, 0, 0)
  const monthAgoTime = monthAgo.getTime()

  const yearAgo = new Date()
  yearAgo.setUTCFullYear(yearAgo.getUTCFullYear() - 1)
  yearAgo.setUTCHours(0, 0, 0, 0)
  const yearAgoTime = yearAgo.getTime()

  const dailyTotal = allOrders
  .filter(o => new Date(o.created_at).getTime() >= todayStart)
  .reduce((sum, o) => sum + getOrderTotal(o), 0)

  const weeklyTotal = allOrders
  .filter(o => new Date(o.created_at).getTime() >= weekAgoTime)
  .reduce((sum, o) => sum + getOrderTotal(o), 0)

  const monthlyTotal = allOrders
  .filter(o => new Date(o.created_at).getTime() >= monthAgoTime)
  .reduce((sum, o) => sum + getOrderTotal(o), 0)

  const yearlyTotal = allOrders
  .filter(o => new Date(o.created_at).getTime() >= yearAgoTime)
  .reduce((sum, o) => sum + getOrderTotal(o), 0)

  const handleFilterChange = (newFilter: string) => {
    router.push(`/dashboard/sales?filter=${newFilter}&branch=${selectedBranch}`)
  }

  const handleBranchChange = (newBranch: string) => {
    router.push(`/dashboard/sales?filter=${filter}&branch=${newBranch}`)
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      <header className="bg-slate-950/95 backdrop-blur-xl p-6 rounded-2xl border border-slate-700 shadow-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 drop-shadow">📊 Business Financial Analytics Ledger</h1>
          <p className="text-xs text-slate-300 mt-1">Audit and filter multi-branch revenue matrixes dynamically.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex bg-slate-900/80 p-1 rounded-xl gap-1 text-xs font-bold text-slate-300 border border-slate-700">
            <button onClick={() => handleFilterChange('all')} className={`px-3 py-2 rounded-lg transition ${filter === 'all'? 'bg-slate-800 text-slate-100' : 'hover:bg-slate-800/50'}`}>All</button>
            <button onClick={() => handleFilterChange('daily')} className={`px-3 py-2 rounded-lg transition ${filter === 'daily'? 'bg-slate-800 text-slate-100' : 'hover:bg-slate-800/50'}`}>Daily</button>
            <button onClick={() => handleFilterChange('weekly')} className={`px-3 py-2 rounded-lg transition ${filter === 'weekly'? 'bg-slate-800 text-slate-100' : 'hover:bg-slate-800/50'}`}>Weekly</button>
            <button onClick={() => handleFilterChange('monthly')} className={`px-3 py-2 rounded-lg transition ${filter === 'monthly'? 'bg-slate-800 text-slate-100' : 'hover:bg-slate-800/50'}`}>Monthly</button>
            <button onClick={() => handleFilterChange('yearly')} className={`px-3 py-2 rounded-lg transition ${filter === 'yearly'? 'bg-slate-800 text-slate-100' : 'hover:bg-slate-800/50'}`}>Yearly</button>
          </div>

          {branches.length > 0 && (
            <select
              onChange={(e) => handleBranchChange(e.target.value)}
              value={selectedBranch}
              className="bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-300"
            >
              <option value="all">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-950/95 backdrop-blur-xl text-slate-100 p-4 rounded-2xl border border-slate-700 shadow-2xl">
          <span className="text-xs font-bold text-slate-400 uppercase">Today</span>
          <h2 className="text-2xl font-black text-emerald-400 font-mono mt-1">UGX {dailyTotal.toLocaleString()}</h2>
        </div>
        <div className="bg-slate-950/95 backdrop-blur-xl text-slate-100 p-4 rounded-2xl border border-slate-700 shadow-2xl">
          <span className="text-xs font-bold text-slate-400 uppercase">This Week</span>
          <h2 className="text-2xl font-black text-emerald-400 font-mono mt-1">UGX {weeklyTotal.toLocaleString()}</h2>
        </div>
        <div className="bg-slate-950/95 backdrop-blur-xl text-slate-100 p-4 rounded-2xl border border-slate-700 shadow-2xl">
          <span className="text-xs font-bold text-slate-400 uppercase">This Month</span>
          <h2 className="text-2xl font-black text-emerald-400 font-mono mt-1">UGX {monthlyTotal.toLocaleString()}</h2>
        </div>
        <div className="bg-slate-950/95 backdrop-blur-xl text-slate-100 p-4 rounded-2xl border border-slate-700 shadow-2xl">
          <span className="text-xs font-bold text-slate-400 uppercase">This Year</span>
          <h2 className="text-2xl font-black text-emerald-400 font-mono mt-1">UGX {yearlyTotal.toLocaleString()}</h2>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="bg-slate-950/95 backdrop-blur-xl text-slate-100 p-6 rounded-2xl border border-slate-700 shadow-2xl flex-1 min-w-[200px]">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Filtered Period Revenue</span>
          <h2 className="text-3xl font-black text-emerald-400 font-mono mt-1 drop-shadow">UGX {periodTotalRevenue.toLocaleString()}</h2>
          <span className="text-xs text-slate-500">{orders.length} orders</span>
        </div>

        <div className="bg-slate-950/95 backdrop-blur-xl p-6 rounded-2xl border border-slate-700 shadow-2xl">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Actions</span>
          <div className="flex gap-2 mt-3 flex-wrap">
            <DownloadPDFButton orders={orders} branchMap={branchMap} filter={filter} />
            <DeleteSalesButton shopId={shopId} filter={filter} branch={selectedBranch} label={`Archive ${filter}`} />
          </div>
        </div>
      </div>

      <div className="bg-slate-950/95 backdrop-blur-xl p-6 rounded-2xl border border-slate-700 shadow-2xl">
        <h2 className="text-lg font-bold text-slate-100 mb-4 drop-shadow">📜 Historical Sales Ledger</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider pb-2">
                <th className="pb-3">Customer Details</th>
                <th className="pb-3">Channel Source</th>
                <th className="pb-3">Branch Node</th>
                <th className="pb-3 text-right">Settled Gross Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {orders.length > 0? (
                orders.map((order) => {
                  const isPOS = order.source === 'POS' || order.source === 'pos'
                  const customerDisplay = isPOS
               ? 'Shop Order'
                    : `${order.customer_name || order.name || 'Unknown'} • ${order.phone || 'No phone'}`

                  return (
                    <tr key={order.id} className="hover:bg-slate-900/70 transition">
                      <td className="py-3 font-bold text-slate-100">
                        {customerDisplay}
                        <span className="block text-xs font-normal text-slate-400 font-mono mt-0.5">
                          {new Date(order.created_at).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 font-medium text-slate-400 uppercase text-xs">
                        {order.source || 'ONLINE'}
                      </td>
                      <td className="py-3 font-semibold text-slate-300">
                        {branchMap.get(order.branch_id) || 'Main Hub'}
                      </td>
                      <td className="py-3 text-right font-black text-emerald-400 font-mono">
                        UGX {getOrderTotal(order).toLocaleString()}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 italic">
                    No sales logs discovered matching the specified filter criteria.
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
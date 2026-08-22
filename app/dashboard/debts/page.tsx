import { createClient } from '@/app/utils/supabase/server'
import { recordNewDebt, settleDebt, deleteClearedDebt, cancelDebtAndRestock } from './actions'
import { redirect } from 'next/navigation'
import ReceiptButton from './ReceiptButton'
import DebtForm from './DebtForm'
import { formatCurrencySync } from '@/app/lib/currencies'

type DebtItem = {
  id: string
  product_name: string
  quantity: number
  unit_price: number
  product_id: string | null
}

type Debt = {
  id: string
  customer_name: string
  customer_phone: string
  total_debt_amount: number
  paid_amount: number
  installment_type: string
  installment_amount: number
  next_due_date: string | null
  status: string
  notes: string | null
  stock_deducted: boolean
  last_updated: string
  debt_items: DebtItem[]
}

type FormattedDebt = Debt & {
  balance: number
  formattedBalance: string
  formattedInstallment: string
  formattedPaid: string
  formattedTotal: string
  whatsappLink: string
  productList: string
  isOverdue: boolean
}

export default async function CustomerDebtsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser() // <-- FIXED BRACKET
  if (!user) return redirect('/login')

  const { data: shop } = await supabase.from('shops').select('id, name, country').eq('owner_id', user.id).maybeSingle()
  if (!shop) return redirect('/signup?error=Please configure your store first')

  const shopCountry = shop.country || 'Uganda'
  const shopName = shop.name || 'Your Shop' // <-- FIXED: prevent null

  const { data: products } = await supabase
.from('products')
.select('id, name, price, stock_quantity')
.eq('shop_id', shop.id)
.order('name')

  const { data: debts } = await supabase
.from('customer_debts')
.select('*, debt_items(*)')
.eq('shop_id', shop.id)
.order('status', { ascending: true })
.order('next_due_date', { ascending: true, nullsFirst: false })

  const allDebts = debts || []
  const activeDebts = allDebts.filter((d: Debt) => d.status === 'active')
  const clearedDebts = allDebts.filter((d: Debt) => d.status === 'cleared')
  const cancelledDebts = allDebts.filter((d: Debt) => d.status === 'cancelled')
  const totalOutstanding = activeDebts.reduce((sum: number, debt: Debt) => sum + (Number(debt.total_debt_amount) - Number(debt.paid_amount)), 0)
  const overdueCount = activeDebts.filter((debt: Debt) => debt.next_due_date && new Date(debt.next_due_date) < new Date()).length

  const formattedTotalOutstanding = formatCurrencySync(totalOutstanding, shopCountry)

  const formattedActiveDebts: FormattedDebt[] = activeDebts.map((debt: Debt) => {
    const balance = Number(debt.total_debt_amount) - Number(debt.paid_amount)
    const cleanPhone = debt.customer_phone.replace(/\D/g, '').replace(/^0/, '256')
    const isOverdue =!!debt.next_due_date && new Date(debt.next_due_date) < new Date()
    const productList = debt.debt_items?.map((i: DebtItem) => `${i.quantity}x ${i.product_name}`).join(', ') || 'No items'

    const formattedBalance = formatCurrencySync(balance, shopCountry)
    const formattedInstallment = formatCurrencySync(Number(debt.installment_amount), shopCountry)
    const formattedPaid = formatCurrencySync(Number(debt.paid_amount), shopCountry)
    const formattedTotal = formatCurrencySync(Number(debt.total_debt_amount), shopCountry)

    const textMessage = encodeURIComponent(`Hi ${debt.customer_name},\n\nReminder: Balance for ${productList} is *${formattedBalance}*.\n${debt.installment_type!== 'once'? `Next ${debt.installment_type} payment: ${formattedInstallment}\nDue: ${debt.next_due_date}\n` : ''}\nPay via Mobile Money. Thanks!`)
    const whatsappLink = `https://wa.me/${cleanPhone}?text=${textMessage}`

    return {
  ...debt,
      balance,
      formattedBalance,
      formattedInstallment,
      formattedPaid,
      formattedTotal,
      whatsappLink,
      productList,
      isOverdue
    }
  })

  const formattedClearedDebts = clearedDebts.map((debt: Debt) => ({
...debt,
    formattedTotal: formatCurrencySync(Number(debt.total_debt_amount), shopCountry)
  }))

  const formattedCancelledDebts = cancelledDebts.map((debt: Debt) => ({
...debt,
    formattedTotal: formatCurrencySync(Number(debt.total_debt_amount), shopCountry)
  }))

  return (
    <div className="min-h-screen p-6 space-y-6">
      <header className="bg-slate-950/95 backdrop-blur-xl p-6 rounded-2xl border-slate-700 shadow-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 drop-shadow">📖 Customer Credit + Installments</h1>
          <p className="text-xs text-slate-300 mt-1">Stock reduces only after 100% payment. Orders auto-added to analytics.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-amber-600/90 backdrop-blur text-white p-4 rounded-xl border border-amber-500/50 shadow-lg">
            <span className="text- font-bold uppercase tracking-wider opacity-90 block">Overdue</span>
            <h2 className="text-2xl font-mono font-black drop-shadow">{overdueCount}</h2>
          </div>
          <div className="bg-rose-600/90 backdrop-blur text-white p-4 rounded-xl border-rose-500/50 shadow-lg">
            <span className="text- font-bold uppercase tracking-wider opacity-90 block">Total Owed</span>
            <h2 className="text-2xl font-mono font-black drop-shadow">{formattedTotalOutstanding}</h2>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-950/95 backdrop-blur-xl p-6 rounded-2xl border-slate-700 shadow-2xl space-y-4 h-fit">
          <h3 className="font-bold text-slate-100 text-base drop-shadow">📝 Record New Credit Sale</h3>
          <DebtForm products={products || []} recordNewDebt={recordNewDebt} />
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-950/95 backdrop-blur-xl p-6 rounded-2xl border border-slate-700 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-100 text-base drop-shadow">📜 Active Credit Accounts</h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {formattedActiveDebts.length > 0? (
                formattedActiveDebts.map((debt) => (
                  <div key={debt.id} className={`p-4 bg-slate-900/80 rounded-xl border ${debt.isOverdue? 'border-rose-500' : 'border-slate-700'} space-y-3`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-extrabold text-slate-100 text-sm">{debt.customer_name}</h4>
                        <p className="text-xs text-slate-400 font-mono">📱 {debt.customer_phone}</p>
                        <p className="text-xs text-slate-300 mt-1">🛒 {debt.productList}</p>
                        {debt.stock_deducted && <p className="text-xs text-emerald-400 mt-1">✓ Stock already deducted</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-rose-400 font-black font-mono">Bal: {debt.formattedBalance}</p>
                        <p className="text- text-slate-500">Paid: {debt.formattedPaid} / {debt.formattedTotal}</p>
                      </div>
                    </div>

                    {debt.installment_type!== 'once' && (
                      <div className={`text-xs p-2 rounded-lg ${debt.isOverdue? 'bg-rose-950/50 text-rose-300' : 'bg-slate-800 text-slate-300'}`}>
                        📅 {debt.installment_type}: {debt.formattedInstallment} | Due: {debt.next_due_date} {debt.isOverdue && '⚠️ OVERDUE'}
                      </div>
                    )}

                    <div className="flex items-center gap-2 justify-end flex-wrap">
                      <ReceiptButton debt={{...debt, shop_name: shopName, shop_country: shopCountry}} /> {/* <-- FIXED */}
                      <a href={debt.whatsappLink} target="_blank" rel="noopener noreferrer" className="bg-green-600 hover:bg-green-500 text-white font-bold p-2 rounded-xl text-xs flex items-center gap-1 shadow-sm transition">
                        💬 Remind
                      </a>
                      <form action={cancelDebtAndRestock}>
                        <input type="hidden" name="debtId" value={debt.id} />
                        <input type="hidden" name="reason" value="Product returned by customer" />
                        <button className="bg-orange-600 hover:bg-orange-500 text-white font-bold p-2 rounded-xl text-xs transition">↩️ Cancel & Restock</button>
                      </form>
                      <form action={settleDebt} className="flex gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-700">
                        <input type="hidden" name="debtId" value={debt.id} />
                        <input type="number" name="paymentAmount" max={debt.balance} min="1" step="any" required placeholder="Amount" className="w-20 border-0 bg-transparent text-center text-xs outline-none font-mono text-white placeholder:text-slate-500" />
                        <button className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-2 py-1 rounded-lg text- uppercase border-slate-700">Pay</button>
                      </form>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-8">No active debts</p>
              )}
            </div>
          </div>

          {formattedClearedDebts.length > 0 && (
            <div className="bg-slate-950/95 backdrop-blur-xl p-6 rounded-2xl border border-emerald-700/50 shadow-2xl space-y-4">
              <h3 className="font-bold text-emerald-400 text-base drop-shadow">✅ Cleared - Click Delete To Archive</h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {formattedClearedDebts.map((debt) => (
                  <div key={debt.id} className="p-3 bg-slate-900/80 rounded-xl border border-emerald-700/30 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-slate-200 font-bold">{debt.customer_name}</p>
                      <p className="text- text-slate-500">{debt.formattedTotal} - PAID & STOCK DEDUCTED</p>
                    </div>
                    <div className="flex gap-2">
                      <ReceiptButton debt={{...debt, shop_name: shopName, shop_country: shopCountry}} /> {/* <-- FIXED */}
                      <form action={deleteClearedDebt}>
                        <input type="hidden" name="debtId" value={debt.id} />
                        <button className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1 rounded-lg text- uppercase">Delete</button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {formattedCancelledDebts.length > 0 && (
            <div className="bg-slate-950/95 backdrop-blur-xl p-6 rounded-2xl border-orange-700/50 shadow-2xl space-y-4">
              <h3 className="font-bold text-orange-400 text-base drop-shadow">↩️ Cancelled Debts - Products Restocked</h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {formattedCancelledDebts.map((debt) => (
                  <div key={debt.id} className="p-3 bg-slate-900/80 rounded-xl border-orange-700/30 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-slate-200 font-bold">{debt.customer_name}</p>
                      <p className="text- text-slate-500">{debt.formattedTotal} - CANCELLED</p>
                    </div>
                    <form action={deleteClearedDebt}>
                      <input type="hidden" name="debtId" value={debt.id} />
                      <button className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1 rounded-lg text- uppercase">Delete</button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
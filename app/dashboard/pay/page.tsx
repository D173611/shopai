import { createClient } from '../../utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

async function submitTransaction(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.log('Submit Error: No user found')
    redirect('/login')
  }

  const transactionId = formData.get('transactionId') as string
  const paymentMethod = formData.get('paymentMethod') as string

  console.log('=== SUBMIT TRANSACTION DEBUG ===')
  console.log('User:', user.email)
  console.log('Transaction ID:', transactionId)
  console.log('Payment Method:', paymentMethod)

  const { data: shop, error: shopError } = await supabase
.from('shops')
.select('id')
.eq('owner_id', user.id)
.single()

  console.log('Shop Query Result:', shop)
  console.log('Shop Error:', shopError)

  if (!shop || !transactionId) {
    console.log('ABORT: Missing shop or transactionId')
    return
  }

  const { data, error } = await supabase
.from('pending_payments')
.insert({
      shop_id: shop.id,
      user_email: user.email,
      transaction_id: transactionId,
      payment_method: paymentMethod,
      status: 'pending'
    })
.select()

  console.log('Insert Result:', data)
  console.log('Insert Error:', error)
  console.log('===============================')

  revalidatePath('/dashboard/pay')
}

export default async function PayPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: shop, error: shopError } = await supabase
.from('shops')
.select('id, name, payment_status, subscription_ends_at, trial_ends_at')
.eq('owner_id', user.id)
.single()

  const { data: config, error: configError } = await supabase
.from('founder_config')
.select('*')
.limit(1)
.maybeSingle()

  const { data: pendingPayment } = await supabase
.from('pending_payments')
.select('*')
.eq('user_email', user.email)
.eq('status', 'pending')
.maybeSingle()

  // DEBUG LOGS - CHECK YOUR TERMINAL
  console.log('=== PAY PAGE DEBUG ===')
  console.log('User ID:', user.id)
  console.log('Shop:', shop)
  console.log('Shop Error:', shopError)
  console.log('Config:', config)
  console.log('Config Error:', configError)
  console.log('========================')

  if (!shop) {
    return <div className="min-h-screen flex items-center justify-center"><div className="bg-slate-950/95 backdrop-blur-xl p-10 rounded-3xl border border-slate-700 text-center text-slate-100">No shop found for your account</div></div>
  }

  const now = new Date()
  const expiryDate = shop.subscription_ends_at || shop.trial_ends_at
  const daysRemaining = expiryDate
? Math.ceil((new Date(expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const isExpired = daysRemaining <= 0
  const isCritical = daysRemaining <= 7

  // Build available payment methods from founder_config
  const paymentMethods = []
  if (config?.mtn_number) paymentMethods.push({ value: 'MTN', label: 'MTN Mobile Money', number: config.mtn_number, color: 'text-yellow-300' })
  if (config?.airtel_number) paymentMethods.push({ value: 'Airtel', label: 'Airtel Money', number: config.airtel_number, color: 'text-red-300' })
  if (config?.bank_details) paymentMethods.push({ value: 'Bank', label: 'Bank Transfer', number: config.bank_details, color: 'text-slate-100' })

  console.log('Payment Methods Array:', paymentMethods)

  return (
    <div className="min-h-screen text-slate-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-slate-950/95 backdrop-blur-xl border border-slate-700 rounded-3xl p-6 shadow-2xl">
          <h1 className="text-2xl font-black text-blue-300 drop-shadow">💳 Renew Subscription - {shop.name}</h1>
          <p className="text-slate-300 text-sm mt-1">Pay now to keep your shop active</p>
        </div>

        <div className={`bg-slate-950/95 backdrop-blur-xl border rounded-3xl p-6 shadow-2xl ${
          isExpired ? 'border-rose-500/50' : isCritical ? 'border-amber-500/50' : 'border-green-500/50'
        }`}>
          <div className="flex justify-between items-center mb-4">
            <span className="text-slate-300 text-sm">Status</span>
            <span className={`px-3 py-1 rounded-lg text-sm font-bold ${
              isExpired ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
              isCritical ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
              'bg-green-500/20 text-green-300 border border-green-500/30'
            }`}>
              {isExpired ? 'EXPIRED' : `${daysRemaining} DAYS LEFT`}
            </span>
          </div>

          {expiryDate && (
            <p className="text-xs text-slate-400">
              {isExpired ? 'Expired on' : 'Expires on'}: {new Date(expiryDate).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="bg-slate-950/95 backdrop-blur-xl border border-slate-700 rounded-3xl p-6 space-y-4 shadow-2xl">
          <h2 className="font-bold text-lg text-slate-100">💰 Payment Details</h2>

          <div className="bg-gradient-to-r from-blue-600/30 to-purple-600/30 backdrop-blur border border-blue-500/40 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-200">Monthly Subscription</p>
            <p className="text-3xl font-black text-blue-300 drop-shadow">
              UGX {config?.subscription_amount?.toLocaleString() || '50,000'}
            </p>
          </div>

          <div className="space-y-3">
            {paymentMethods.length === 0 ? (
              <div className="text-center space-y-2">
                <p className="text-sm text-amber-300">No payment methods set up. Contact support.</p>
                <p className="text-xs text-slate-500">Debug: config is {config ? 'loaded' : 'null'}</p>
              </div>
            ) : (
              paymentMethods.map((method) => (
                <div key={method.value} className="bg-slate-900/80 rounded-xl p-4 border border-slate-700">
                  <p className="text-xs text-slate-400">{method.label}</p>
                  <p className={`text-lg font-mono font-bold ${method.color}`}>{method.number}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {pendingPayment ? (
          <div className="bg-amber-950/90 backdrop-blur-xl border border-amber-500/40 rounded-3xl p-6 text-center shadow-2xl">
            <p className="text-amber-300 font-bold">⏳ Payment Submitted</p>
            <p className="text-sm text-slate-200 mt-2">
              Transaction ID: <span className="font-mono text-yellow-300">{pendingPayment.transaction_id}</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">Awaiting approval. We'll activate within 10 minutes.</p>
          </div>
        ) : (
          <div className="bg-slate-950/95 backdrop-blur-xl border border-slate-700 rounded-3xl p-6 space-y-4 shadow-2xl">
            <h2 className="font-bold text-lg text-slate-100">✅ Submit Payment</h2>
            <form action={submitTransaction} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300">Payment Method</label>
                <select name="paymentMethod" required className="w-full bg-slate-900/80 border border-slate-700 rounded-xl p-3 mt-1 text-sm text-slate-100">
                  <option value="">Select method</option>
                  {paymentMethods.map((method) => (
                    <option key={method.value} value={method.value}>{method.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300">Transaction ID / Reference</label>
                <input
                  name="transactionId"
                  type="text"
                  required
                  placeholder="e.g. MP241015.1234.A56789"
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl p-3 mt-1 text-sm font-mono text-slate-100 placeholder:text-slate-500"
                />
              </div>

              <button
                type="submit"
                disabled={paymentMethods.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl border border-blue-500/50 transition"
              >
                Submit for Approval
              </button>
            </form>
          </div>
        )}

        <div className="bg-slate-950/95 backdrop-blur-xl border border-slate-700 rounded-3xl p-6 shadow-2xl">
          <h3 className="font-bold text-sm mb-3 text-slate-100">📞 Need Help?</h3>
          <div className="space-y-2 text-sm">
            {config?.whatsapp_number && (
              <a href={`https://wa.me/${config.whatsapp_number.replace(/[^0-9]/g, '')}`}
                 target="_blank"
                 className="block text-green-300 hover:text-green-200 bg-green-500/10 border border-green-500/30 rounded-xl p-3">
                WhatsApp: {config.whatsapp_number}
              </a>
            )}
            {config?.support_phone && (
              <a href={`tel:${config.support_phone}`}
                 className="block text-blue-300 hover:text-blue-200 bg-slate-900/80 rounded-xl p-3 border border-slate-700">
                Call: {config.support_phone}
              </a>
            )}
            {!config?.whatsapp_number && !config?.support_phone && (
              <p className="text-slate-400 text-xs">Contact info not set up yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
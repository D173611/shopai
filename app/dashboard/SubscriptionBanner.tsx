'use client'
import { createClient } from '../utils/supabase/client'

type Config = {
  mtn_number: string | null
  airtel_number: string | null
  bank_details: string | null
  support_email: string | null
  support_phone: string | null
  whatsapp_number: string | null
  subscription_amount: number | null
} | null

type Shop = {
  id: string
  name: string
  payment_status: string | null
  last_transaction_id: string | null
  subscription_ends_at: string | null
  trial_ends_at: string | null
}

async function submitTransactionId(formData: FormData) {
  const supabase = createClient()
  const shopId = formData.get('shopId') as string
  const transactionId = formData.get('transactionId') as string
  if (!transactionId) return
  await supabase.from('shops').update({
    last_transaction_id: transactionId,
    payment_status: 'pending_approval'
  }).eq('id', shopId)
  window.location.reload()
}

export function SubscriptionLockScreen({ shop, config, daysRemaining }: { shop: Shop, config: Config, daysRemaining: number }) {
  const amount = config?.subscription_amount ?? 50000
  const mtn = config?.mtn_number ?? null
  const airtel = config?.airtel_number ?? null
  const bank = config?.bank_details ?? null
  const whatsapp = config?.whatsapp_number ?? null
  const phone = config?.support_phone ?? '+256700000000'
  const email = config?.support_email ?? 'support@shopai.ug'

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-rose-950/95 backdrop-blur-xl border-2 border-rose-500/40 rounded-3xl p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black text-rose-400 drop-shadow">⛔ Subscription Expired</h1>
            <p className="text-rose-200 text-sm">Your shop "{shop.name}" is locked. Pay to reactivate.</p>
            <p className="text-rose-400 text-xs font-bold">
              {daysRemaining < 0? `${Math.abs(daysRemaining)} days overdue` : 'Expired today'}
            </p>
          </div>

          <div className="bg-gradient-to-r from-blue-600/30 to-purple-600/30 backdrop-blur border border-blue-500/40 rounded-2xl p-6 text-center">
            <p className="text-slate-200 text-sm mb-1">Amount to Pay for 30 Days</p>
            <p className="text-4xl font-black text-blue-300 drop-shadow">
              UGX {amount.toLocaleString()}
            </p>
          </div>

          <div className="bg-slate-900/80 backdrop-blur rounded-2xl p-6 space-y-4 border border-slate-700">
            <h3 className="font-bold text-lg text-slate-100">💰 Step 1: Send Payment</h3>
            {(!mtn &&!airtel &&!bank)? (
              <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-4 text-center">
                <p className="text-amber-300 font-bold text-sm">Contact support for payment details</p>
                <p className="text-slate-300 text-xs mt-1">Payment methods will be sent via WhatsApp</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                {mtn && (
                  <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4">
                    <p className="text-yellow-300 font-bold mb-1">MTN Mobile Money</p>
                    <p className="text-slate-100 font-mono text-lg">{mtn}</p>
                  </div>
                )}
                {airtel && (
                  <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
                    <p className="text-red-300 font-bold mb-1">Airtel Money</p>
                    <p className="text-slate-100 font-mono text-lg">{airtel}</p>
                  </div>
                )}
                {bank && (
                  <div className="md:col-span-2 bg-blue-500/20 border border-blue-500/30 rounded-xl p-4">
                    <p className="text-blue-300 font-bold mb-1">Bank Transfer</p>
                    <p className="text-slate-100 font-mono text-sm whitespace-pre-wrap">{bank}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-slate-900/80 backdrop-blur rounded-2xl p-6 space-y-4 border border-slate-700">
            <h3 className="font-bold text-lg text-slate-100">📝 Step 2: Submit Transaction ID</h3>
            {shop.payment_status === 'pending_approval'? (
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4 text-center">
                <p className="text-blue-300 font-bold">⏳ Payment Under Review</p>
                <p className="text-slate-200 text-sm mt-1">
                  Transaction ID: <span className="font-mono text-yellow-300">{shop.last_transaction_id}</span>
                </p>
                <p className="text-xs text-slate-400 mt-2">Admin will activate your account soon</p>
              </div>
            ) : (
              <form action={submitTransactionId} className="space-y-3">
                <input type="hidden" name="shopId" value={shop.id} />
                <input
                  name="transactionId"
                  type="text"
                  required
                  placeholder="Paste your MTN/Airtel/Bank transaction ID here"
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-3.5 text-sm outline-none focus:border-blue-500 text-slate-100 font-mono placeholder:text-slate-500"
                />
                <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold p-3.5 rounded-xl transition">
                  Submit for Approval
                </button>
              </form>
            )}
          </div>

          <div className="bg-slate-900/80 backdrop-blur rounded-2xl p-6 space-y-3 border border-slate-700">
            <h3 className="font-bold text-lg text-slate-100">📞 Need Help?</h3>
            <div className="space-y-2 text-sm">
              {whatsapp && (
                <a href={`https://wa.me/${whatsapp.replace(/\D/g,'')}`}
                   target="_blank"
                   className="flex items-center gap-3 bg-green-500/20 border border-green-500/30 rounded-xl p-3 hover:bg-green-500/30 transition">
                  <span className="text-green-300 font-bold">WhatsApp:</span>
                  <span className="text-slate-100 font-mono">{whatsapp}</span>
                </a>
              )}
              <a href={`tel:${phone}`}
                 className="flex items-center gap-3 bg-slate-800/80 rounded-xl p-3 hover:bg-slate-700/80 transition border border-slate-700">
                <span className="text-slate-300 font-bold">Call:</span>
                <span className="text-slate-100 font-mono">{phone}</span>
              </a>
              <a href={`mailto:${email}`}
                 className="flex items-center gap-3 bg-slate-800/80 rounded-xl p-3 hover:bg-slate-700/80 transition border border-slate-700">
                <span className="text-slate-300 font-bold">Email:</span>
                <span className="text-slate-100 font-mono">{email}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ExpiringSoonBanner({ daysRemaining, config }: { daysRemaining: number, config: Config }) {
  const amount = config?.subscription_amount ?? 50000
  const mtn = config?.mtn_number ?? null
  const airtel = config?.airtel_number ?? null
  const whatsapp = config?.whatsapp_number ?? null

  return (
    <div id="payment" className="bg-amber-950/90 backdrop-blur-xl border-2 border-amber-500/40 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xl">
      <div className="flex items-center gap-3">
        <span className="text-2xl">⚠️</span>
        <div>
          <p className="font-bold text-amber-300">Subscription Expiring Soon</p>
          <p className="text-xs text-amber-200">
            Only {daysRemaining} {daysRemaining === 1? 'day' : 'days'} left. Pay UGX {amount.toLocaleString()} to avoid lockout.
          </p>
        </div>
      </div>
      <div className="flex gap-2 text-xs flex-wrap">
        {mtn && <span className="bg-yellow-500/30 text-yellow-200 px-3 py-1 rounded-lg font-mono border border-yellow-500/40">MTN: {mtn}</span>}
        {airtel && <span className="bg-red-500/30 text-red-200 px-3 py-1 rounded-lg font-mono border border-red-500/40">Airtel: {airtel}</span>}
        {whatsapp && (
          <a href={`https://wa.me/${whatsapp.replace(/\D/g,'')}`} target="_blank" className="bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-1 rounded-lg transition">
            Pay via WhatsApp
          </a>
        )}
        {!mtn &&!airtel &&!whatsapp && (
          <span className="bg-slate-700/80 text-slate-200 px-3 py-1 rounded-lg border border-slate-600">Contact support</span>
        )}
      </div>
    </div>
  )
}
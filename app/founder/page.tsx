import { createClient } from '../utils/supabase/server'
import { createAdminClient } from '../utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

const FOUNDER_EMAIL = 'tumusiimedan17361@gmail.com'
const ADMIN_PASSWORD = process.env.FOUNDER_PASSWORD || ''

async function assertIsAdmin() {
  const cookieStore = await cookies()
  const isAuthed = cookieStore.get('founder_auth')?.value === 'true'
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!isAuthed ||!user || user.email!== FOUNDER_EMAIL) {
    throw new Error('Unauthorized')
  }
}

async function updateShopDays(formData: FormData) {
  'use server'
  await assertIsAdmin()

  const supabase = createAdminClient()
  const shopId = formData.get('shopId') as string
  const daysToAdd = parseInt(formData.get('daysToAdd') as string)

  if (!shopId) throw new Error('Missing shopId')
  if (isNaN(daysToAdd) || daysToAdd < 1) throw new Error('Invalid days: must be 1 or more')

  const newExpiryDate = new Date()
  newExpiryDate.setDate(newExpiryDate.getDate() + daysToAdd)

  const { data, error } = await supabase
.from('shops')
.update({
      subscription_ends_at: newExpiryDate.toISOString(),
      payment_status: 'active',
      trial_ends_at: null
    })
.eq('id', shopId)
.select()
.single()

  if (error) throw new Error(`Update failed: ${error.message}`)
  if (!data) throw new Error('No shop found with that ID')

  revalidatePath('/founder')
}

async function lockShop(formData: FormData) {
  'use server'
  await assertIsAdmin()

  const supabase = createAdminClient()
  const shopId = formData.get('shopId') as string

  if (!shopId) throw new Error('Missing shopId')

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  const { error } = await supabase
.from('shops')
.update({
      subscription_ends_at: yesterday.toISOString(),
      payment_status: 'expired'
    })
.eq('id', shopId)

  if (error) throw new Error(`Lock failed: ${error.message}`)
  revalidatePath('/founder')
}

async function approvePayment(formData: FormData) {
  'use server'
  await assertIsAdmin()

  const supabase = createAdminClient()
  const shopId = formData.get('shopId') as string
  const paymentId = formData.get('paymentId') as string
  const daysToAdd = parseInt(formData.get('daysToAdd') as string) || 30

  if (!shopId) throw new Error('Missing shopId')
  if (isNaN(daysToAdd) || daysToAdd < 1) throw new Error('Invalid days: must be 1 or more')

  const newExpiryDate = new Date()
  newExpiryDate.setDate(newExpiryDate.getDate() + daysToAdd)

  const { error } = await supabase
.from('shops')
.update({
      payment_status: 'active',
      subscription_ends_at: newExpiryDate.toISOString(),
      trial_ends_at: null
    })
.eq('id', shopId)

  if (error) throw new Error(`Approve failed: ${error.message}`)

  if (paymentId) {
    await supabase
 .from('pending_payments')
 .update({
      status: 'approved',
      days_granted: daysToAdd
    })
 .eq('id', paymentId)
  }

  revalidatePath('/founder')
}

async function updateConfig(formData: FormData) {
  'use server'
  await assertIsAdmin()

  const supabase = createAdminClient()
  const { data: existing } = await supabase.from('founder_config').select('id').limit(1).maybeSingle()

  const { error } = await supabase.from('founder_config').upsert({
...(existing?.id && { id: existing.id }),
    mtn_number: formData.get('mtn') as string,
    airtel_number: formData.get('airtel') as string,
    bank_details: formData.get('bank') as string,
    support_email: formData.get('email') as string,
    support_phone: formData.get('phone') as string,
    whatsapp_number: formData.get('whatsapp') as string,
    subscription_amount: parseFloat(formData.get('amount') as string) || 50000,
    updated_at: new Date().toISOString()
  })

  if (error) throw new Error(`Config update failed: ${error.message}`)
  revalidatePath('/founder')
}

async function verifyPassword(formData: FormData) {
  'use server'
  const password = formData.get('password') as string
  if (!ADMIN_PASSWORD) redirect('/founder?error=Server configuration error')
  const cookieStore = await cookies()
  if (password === ADMIN_PASSWORD) {
    cookieStore.set('founder_auth', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 4
    })
    redirect('/founder')
  } else {
    redirect('/founder?error=Invalid password')
  }
}

async function logoutAdmin() {
  'use server'
  const cookieStore = await cookies()
  cookieStore.delete('founder_auth')
  redirect('/founder')
}

function PasswordGate({ error }: { error?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-950/95 backdrop-blur-xl border border-slate-700 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-slate-100">🔒 Founder Access</h1>
          <p className="text-xs text-slate-400">Enter control panel password</p>
        </div>
        {error && <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
          <p className="text-xs text-rose-400 text-center font-bold">{error}</p>
        </div>}
        <form action={verifyPassword} className="space-y-4">
          <input name="password" type="password" required placeholder="Admin Password"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3.5 text-sm outline-none focus:border-blue-500 text-slate-100" />
          <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold p-3.5 rounded-xl transition">
            Unlock Panel
          </button>
        </form>
      </div>
    </div>
  )
}

export default async function FounderAdminPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error: searchError } = await searchParams

  const supabaseAuth = await createClient()
  const supabase = createAdminClient()

  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user || user.email!== FOUNDER_EMAIL) {
    return <div className="min-h-screen flex items-center justify-center p-10 font-bold text-rose-600 text-2xl bg-slate-950/95 backdrop-blur-xl">⛔ Access Denied: Founder Only</div>
  }

  const cookieStore = await cookies()
  const isAuthed = cookieStore.get('founder_auth')?.value === 'true'

  if (!isAuthed) {
    return <PasswordGate error={searchError} />
  }

  const { data: shops } = await supabase
.from('shops')
.select('id, name, owner_email, payment_status, trial_ends_at, subscription_ends_at, last_transaction_id, created_at')
.order('created_at', { ascending: false })

  const { data: config } = await supabase
.from('founder_config')
.select('*')
.limit(1)
.maybeSingle()

  const { data: pendingPayments } = await supabase
.from('pending_payments')
.select('*, shops(name, owner_email)')
.eq('status', 'pending')
.order('created_at', { ascending: false })

  const now = new Date()
  const shopsWithDays = shops?.map(shop => {
    const expiryDate = shop.subscription_ends_at || shop.trial_ends_at
    const daysRemaining = expiryDate
 ? Math.ceil((new Date(expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0
    return {...shop, daysRemaining }
  }) || []

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-6">
      <header className="bg-slate-950/95 backdrop-blur-xl border border-slate-700 rounded-3xl p-6 flex justify-between items-center shadow-2xl">
        <div>
          <h1 className="text-2xl font-black text-blue-400 drop-shadow">🔐 Founder Control Panel</h1>
          <p className="text-slate-300 text-xs mt-1">Manage shops, payments, and subscriptions</p>
        </div>
        <form action={logoutAdmin}>
          <button className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 rounded-xl text-xs">
            Lock Panel
          </button>
        </form>
      </header>

      {pendingPayments && pendingPayments.length > 0 && (
        <div className="bg-slate-950/95 backdrop-blur-xl p-6 rounded-3xl border border-amber-500/50 shadow-2xl">
          <h2 className="font-bold text-lg mb-4 text-amber-400 drop-shadow">⏳ Pending Payments: {pendingPayments.length}</h2>
          <div className="space-y-3">
            {pendingPayments.map((payment: any) => (
              <div key={payment.id} className="bg-slate-900/90 border border-slate-700 rounded-xl p-4 flex justify-between items-center">
                <div className="space-y-1">
                  <p className="font-bold text-slate-100">{payment.shops?.name || 'Unknown Shop'}</p>
                  <p className="text-xs text-slate-300 font-mono">{payment.user_email}</p>
                  <p className="text-xs text-yellow-400 font-mono">TXN: {payment.transaction_id}</p>
                  <p className="text-xs text-slate-400">Method: {payment.payment_method} | {new Date(payment.created_at).toLocaleString()}</p>
                </div>
                <form action={approvePayment} className="flex gap-2 items-center">
                  <input type="hidden" name="shopId" value={payment.shop_id} />
                  <input type="hidden" name="paymentId" value={payment.id} />
                  <input
                    type="number"
                    name="daysToAdd"
                    defaultValue={30}
                    min="1"
                    max="3650"
                    required
                    className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-center text-white"
                    placeholder="Days"
                  />
                  <button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs">
                    Approve
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-950/95 backdrop-blur-xl p-6 rounded-3xl border border-slate-700 shadow-2xl">
        <h2 className="font-bold text-lg mb-4 text-slate-100 drop-shadow">💰 Payment & Contact Details</h2>
        <form action={updateConfig} className="grid md:grid-cols-3 gap-3">
          <input
            name="amount"
            type="number"
            defaultValue={config?.subscription_amount || 50000}
            placeholder="Monthly Amount (UGX)"
            className="md:col-span-3 bg-slate-900 border-2 border-blue-500/50 p-3 rounded-xl text-sm font-bold text-blue-400"
          />
          <input name="mtn" defaultValue={config?.mtn_number || ''} placeholder="MTN Number" className="bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm text-white placeholder:text-slate-500" />
          <input name="airtel" defaultValue={config?.airtel_number || ''} placeholder="Airtel Number" className="bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm text-white placeholder:text-slate-500" />
          <input name="bank" defaultValue={config?.bank_details || ''} placeholder="Bank Details" className="bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm text-white placeholder:text-slate-500" />
          <input name="email" defaultValue={config?.support_email || ''} placeholder="Support Email" className="bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm text-white placeholder:text-slate-500" />
          <input name="phone" defaultValue={config?.support_phone || ''} placeholder="Support Phone" className="bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm text-white placeholder:text-slate-500" />
          <input name="whatsapp" defaultValue={config?.whatsapp_number || ''} placeholder="WhatsApp" className="bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm text-white placeholder:text-slate-500" />
          <button className="md:col-span-3 bg-blue-600 font-bold text-white px-6 py-2.5 rounded-xl text-sm hover:bg-blue-500">Update Config</button>
        </form>
      </div>

      <div className="bg-slate-950/95 backdrop-blur-xl rounded-3xl p-6 border border-slate-700 shadow-2xl">
        <h2 className="font-bold text-lg mb-4 text-slate-100 drop-shadow">🏪 All Shops: {shopsWithDays.length}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-300 uppercase border-b border-slate-700">
              <tr>
                <th className="text-left p-3">Shop</th>
                <th className="text-left p-3">Owner</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Days Left</th>
                <th className="text-left p-3">Transaction ID</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shopsWithDays.map(shop => {
                const isExpired = shop.daysRemaining <= 0
                const isCritical = shop.daysRemaining <= 3 && shop.daysRemaining > 0

                return (
                  <tr key={shop.id} className="border-b border-slate-800/50 hover:bg-slate-900/70">
                    <td className="p-3 font-bold text-slate-100">{shop.name || 'Unnamed'}</td>
                    <td className="p-3 text-slate-300 text-xs font-mono">{shop.owner_email}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        shop.payment_status === 'active'? 'bg-green-500/20 text-green-400' :
                        shop.payment_status === 'pending_approval'? 'bg-blue-500/20 text-blue-400' :
                        'bg-rose-500/20 text-rose-400'
                      }`}>
                        {shop.payment_status || 'trial'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`font-mono font-bold ${
                        isExpired? 'text-rose-400' :
                        isCritical? 'text-amber-400' :
                        'text-green-400'
                      }`}>
                        {isExpired? `${Math.abs(shop.daysRemaining)} overdue` : `${shop.daysRemaining} days`}
                      </span>
                    </td>
                    <td className="p-3 text-xs font-mono text-yellow-400">
                      {shop.last_transaction_id || 'None'}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2 justify-end">
                        <form action={updateShopDays} className="flex gap-1">
                          <input type="hidden" name="shopId" value={shop.id} />
                          <input type="number" name="daysToAdd" placeholder="Days" min="1" max="3650" required
                            className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-white" />
                          <button className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1 rounded-lg text-xs">
                            Set
                          </button>
                        </form>

                        {shop.payment_status === 'pending_approval'? (
                          <form action={approvePayment}>
                            <input type="hidden" name="shopId" value={shop.id} />
                            <button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1 rounded-lg text-xs">
                              Approve
                            </button>
                          </form>
                        ) : (
                          <form action={lockShop}>
                            <input type="hidden" name="shopId" value={shop.id} />
                            <button className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1 rounded-lg text-xs"
                              disabled={shop.payment_status === 'expired'}>
                              {shop.payment_status === 'expired'? 'Locked' : 'Lock'}
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}      
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/app/utils/supabase/client'
import POSComponent from '../cashier/pos/POSComponent'
import OrdersComponent from '../cashier/orders/OrdersComponent'
import { User } from '@supabase/supabase-js'

function nameToCashierEmail(name: string, shopId: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '')
  return `${slug}.${shopId.slice(0, 8)}@shop.cashier`
}

export default function CashierLoginPage({ params }: { params: Promise<{ slug: string }> }) {
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [shopData, setShopData] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [view, setView] = useState<'pos' | 'orders'>('pos')
  const supabase = createClient()

  // Check if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { slug } = await params
      const { data: shop } = await supabase
       .from('shops')
       .select('id, name, slug')
       .eq('slug', slug)
       .maybeSingle()
      
      if (shop) {
        const session = localStorage.getItem(`cashier_session_${shop.id}`)
        if (session) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            setShopData(shop)
            setCurrentUser(user)
            setIsLoggedIn(true)
          }
        }
      }
    }
    checkSession()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { slug } = await params

    // 1. Get shop_id from slug
    const { data: shop, error: shopErr } = await supabase
     .from('shops')
     .select('id, name, slug')
     .eq('slug', slug)
     .maybeSingle()

    if (shopErr ||!shop) {
      setError('Shop not found')
      setLoading(false)
      return
    }

    // 2. Generate the email the same way you did on register
    const email = nameToCashierEmail(name.trim(), shop.id)

    // 3. Sign in with Supabase Auth
    const { data, error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password: pin
    })

    if (signInErr ||!data.user) {
      setError('Invalid name or PIN')
      setLoading(false)
      return
    }

    // 4. Verify this user is actually a cashier for this shop
    const { data: staffMember, error: staffErr } = await supabase
     .from('staff_members')
     .select('role')
     .eq('user_id', data.user.id)
     .eq('shop_id', shop.id)
     .eq('role', 'cashier')
     .maybeSingle()

    if (staffErr ||!staffMember) {
      await supabase.auth.signOut()
      setError('You are not a cashier for this shop')
      setLoading(false)
      return
    }

    // 5. Save session for POS
    localStorage.setItem(`cashier_session_${shop.id}`, JSON.stringify({
      cashierId: data.user.id,
      cashierName: name.trim(),
      shopId: shop.id,
      shopName: shop.name
    }))

    setShopData(shop)
    setCurrentUser(data.user)
    setIsLoggedIn(true)
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    if (shopData) localStorage.removeItem(`cashier_session_${shopData.id}`)
    setIsLoggedIn(false)
    setShopData(null)
    setCurrentUser(null)
  }

  // AFTER LOGIN - SHOW POS/ORDERS HERE
  if (isLoggedIn && shopData && currentUser) {
    return (
      <div className="min-h-screen">
        <div className="bg-black/40 backdrop-blur-md border-b border-white/10 p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-black text-slate-100 drop-shadow-lg">{shopData.name}</h1>
              <div className="flex gap-2">
                <button
                  onClick={() => setView('pos')}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
                    view === 'pos'
                     ? 'bg-blue-600 text-white'
                      : 'bg-white/10 text-slate-200 hover:bg-white/20'
                  }`}
                >
                  POS
                </button>
                <button
                  onClick={() => setView('orders')}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
                    view === 'orders'
                     ? 'bg-blue-600 text-white'
                      : 'bg-white/10 text-slate-200 hover:bg-white/20'
                  }`}
                >
                  Orders
                </button>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-rose-400 hover:text-rose-300 font-bold drop-shadow-lg"
            >
              Logout
            </button>
          </div>
        </div>

        <div>
          {view === 'pos' && <POSComponent shop={shopData} user={currentUser} />}
          {view === 'orders' && <OrdersComponent shop={shopData} user={currentUser} />}
        </div>
      </div>
    )
  }

  // BEFORE LOGIN - SHOW LOGIN FORM
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-black/40 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-slate-100 drop-shadow-lg">💰 Cashier Login</h1>
          <p className="text-xs text-slate-300">Enter your name and PIN</p>
        </div>
        {error && <div className="bg-rose-500/20 backdrop-blur-xl border border-rose-400/30 p-3 rounded-xl">
          <p className="text-xs text-rose-300 text-center font-bold">{error}</p>
        </div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            required
            placeholder="Your Name"
            className="w-full bg-white/10 border border-white/20 rounded-xl p-3.5 text-sm outline-none focus:border-blue-400 text-slate-100 placeholder:text-slate-400"
          />
          <input
            value={pin}
            onChange={e => setPin(e.target.value)}
            type="password"
            required
            placeholder="PIN"
            maxLength={6}
            className="w-full bg-white/10 border border-white/20 rounded-xl p-3.5 text-sm outline-none focus:border-blue-400 text-slate-100 placeholder:text-slate-400 font-mono"
          />
          <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold p-3.5 rounded-xl transition">
            {loading? 'Logging in...' : 'Open POS Terminal'}
          </button>
        </form>
      </div>
    </div>
  )
}
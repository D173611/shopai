'use client'

import { useState, use } from 'react'
import { signup } from './actions'
import DynamicBg from '../../components/DynamicBg' // <-- FIXED: 2 levels up to app/components

export default function SignupForm({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error, success } = use(searchParams)

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [clientError, setClientError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (password!== confirmPassword) {
      e.preventDefault()
      setClientError('Passwords do not match')
      return
    }
    setClientError(null)
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* 🎨 Premium Moving Wallpaper Background Layer */}
      <DynamicBg />

      {/* High-End Glassmorphic Card Container */}
      <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl rounded-3xl shadow-2xl border-white/10 p-8 z-10 text-white">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black tracking-tight">Create ShopAI Account</h1>
          <p className="text-slate-300 text-xs mt-1">Start tracking your inventory and managing cashiers</p>
        </div>

        {clientError && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-3.5 text-xs font-medium">
            ⚠️ {clientError}
          </div>
        )}

        {error && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-3.5 text-xs font-medium">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-blue-500/10 border-blue-500/20 text-blue-300 rounded-xl p-3.5 text-xs font-medium">
            ✉️ Check your email. We sent a confirmation link to activate your account. Click it to log in. Check spam too.
          </div>
        )}

        <form action={signup} onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">Business Email</label>
            <input name="email" type="email" required placeholder="owner@company.com" className="w-full border border-white/10 rounded-xl p-3 bg-white/5 outline-none focus:border-blue-500 text-sm transition" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">Secure Password</label>
            <div className="relative">
              <input name="password" type={showPassword? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Minimum 6 characters" className="w-full border-white/10 rounded-xl p-3 pr-10 bg-white/5 outline-none focus:border-blue-500 text-sm transition" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-semibold">
                {showPassword? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">Confirm Password</label>
            <div className="relative">
              <input type={showConfirmPassword? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="Re-enter password" className="w-full border-white/10 rounded-xl p-3 pr-10 bg-white/5 outline-none focus:border-blue-500 text-sm transition" />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-semibold">
                {showConfirmPassword? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">Official Company Name</label>
            <input name="shopName" type="text" required placeholder="e.g., Kikuubo Wholesale Traders" className="w-full border-white/10 rounded-xl p-3 bg-white/5 outline-none focus:border-blue-500 text-sm transition" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">Store URL Link (Slug)</label>
            <input name="slug" type="text" required placeholder="e.g., kikuubomega" className="w-full border border-white/10 rounded-xl p-3 bg-white/5 outline-none focus:border-blue-500 text-sm transition" />
          </div>
          <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold p-3.5 rounded-xl transition shadow-lg shadow-blue-500/10 mt-2 text-sm uppercase tracking-wider">
            Create System & Launch
          </button>
        </form>

        <p className="text-xs text-slate-300 text-center mt-6">
          Already running a store? <a href="/login" className="text-blue-400 font-semibold hover:underline">Log in here</a>
        </p>
      </div>
    </div>
  )
}
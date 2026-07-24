'use client'

import { useState } from 'react'
import { createClient } from '@/app/utils/supabase/client'
import DynamicBg from '../../components/DynamicBg'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })

    if (error) {
      setError(error.message)
    } else {
      setMessage('Check your email for the password reset link!')
    }
    setLoading(false)
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <DynamicBg />
      <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 p-8 z-10 text-white">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black tracking-tight">Reset Password</h1>
          <p className="text-slate-300 text-xs mt-1">Enter your email and we'll send you a recovery link</p>
        </div>

        {error && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-3.5 text-xs font-medium">
            ⚠️ {error}
          </div>
        )}

        {message && (
          <div className="mb-4 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-xl p-3.5 text-xs font-medium">
            ✉️ {message}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">Business Email</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="owner@company.com" 
              className="w-full border border-white/10 rounded-xl p-3 bg-white/5 outline-none focus:border-blue-500 text-sm transition" 
            />
          </div>
          <button 
            disabled={loading} 
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white font-extrabold p-3.5 rounded-xl transition shadow-lg shadow-blue-500/10 mt-2 text-sm uppercase tracking-wider"
          >
            {loading ? 'Sending Link...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="text-xs text-slate-300 text-center mt-6">
          Remembered your password? <a href="/login" className="text-blue-400 font-semibold hover:underline">Log in here</a>
        </p>
      </div>
    </div>
  )
}
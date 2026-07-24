'use client'

import { useState } from 'react'
import { createClient } from '@/app/utils/supabase/client'
import { useRouter } from 'next/navigation'
import DynamicBg from '../../components/DynamicBg'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      alert('Password updated successfully!')
      router.push('/dashboard')
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <DynamicBg />
      <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 p-8 z-10 text-white">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black tracking-tight">Set New Password</h1>
          <p className="text-slate-300 text-xs mt-1">Enter your new secure password below</p>
        </div>

        {error && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-3.5 text-xs font-medium">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">New Password</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Minimum 6 characters" 
                className="w-full border border-white/10 rounded-xl p-3 pr-10 bg-white/5 outline-none focus:border-blue-500 text-sm transition" 
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-semibold">
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">Confirm New Password</label>
            <input 
              type={showPassword ? 'text' : 'password'} 
              required 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              placeholder="Re-enter new password" 
              className="w-full border border-white/10 rounded-xl p-3 bg-white/5 outline-none focus:border-blue-500 text-sm transition" 
            />
          </div>
          <button 
            disabled={loading} 
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white font-extrabold p-3.5 rounded-xl transition shadow-lg shadow-blue-500/10 mt-2 text-sm uppercase tracking-wider"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
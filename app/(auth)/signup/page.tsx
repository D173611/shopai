import { signup } from './actions'
import DynamicBg from '../../components/DynamicBg'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error, success } = await searchParams

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* 🎨 Premium Moving Wallpaper Background Layer */}
      <DynamicBg />

      {/* High-End Glassmorphic Card Container */}
      <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 p-8 z-10 text-white">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black tracking-tight">Create ShopAI Account</h1>
          <p className="text-slate-300 text-xs mt-1">Start tracking your inventory and managing cashiers</p>
        </div>

        {error && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-3.5 text-xs font-medium">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-xl p-3.5 text-xs font-medium">
            ✉️ Check your email. We sent a confirmation link to activate your account. Click it to log in. Check spam too.
          </div>
        )}

        <form action={signup} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">Business Email</label>
            <input name="email" type="email" required placeholder="owner@company.com" className="w-full border border-white/10 rounded-xl p-3 bg-white/5 outline-none focus:border-blue-500 text-sm transition" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">Secure Password</label>
            <input name="password" type="password" required placeholder="Minimum 6 characters" className="w-full border border-white/10 rounded-xl p-3 bg-white/5 outline-none focus:border-blue-500 text-sm transition" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">Official Company Name</label>
            <input name="shopName" type="text" required placeholder="e.g., Kikuubo Wholesale Traders" className="w-full border border-white/10 rounded-xl p-3 bg-white/5 outline-none focus:border-blue-500 text-sm transition" />
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
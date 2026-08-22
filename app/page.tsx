import Link from 'next/link'
import DynamicBg from './components/DynamicBg'

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col justify-between items-center px-4 overflow-hidden">
      {/* 🎨 The Luxury 15-Minute Dynamic Background Agent */}
      <DynamicBg />

      {/* Top Header Branding Banner Element */}
      <header className="w-full max-w-6xl py-6 flex justify-between items-center border-b border-white/10 backdrop-blur-xs z-10">
        <div className="flex items-center space-x-2.5">
          <span className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black px-3.5 py-1.5 rounded-xl text-lg shadow-lg shadow-blue-500/20">
            S-AI
          </span>
          <span className="text-lg font-black tracking-tight text-white">
            ShopAI <span className="text-blue-400 font-medium text-xs bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20 ml-1">Retail OS</span>
          </span>
        </div>
        <Link href="/login" className="text-xs font-bold text-slate-300 hover:text-white transition bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-md">
          Portal Log In
        </Link>
      </header>

      {/* Main Glassmorphism Presentation Container Card */}
      <div className="w-full max-w-3xl text-center space-y-6 my-auto z-10 py-12 px-6 rounded-3xl bg-slate-950/40 border border-white/5 backdrop-blur-md shadow-2xl">
        <div className="inline-flex items-center space-x-2 bg-blue-500/10 text-blue-400 font-semibold px-4 py-1.5 rounded-full text-xs border border-blue-500/20 tracking-wide uppercase mx-auto">
          <span>🌍 Crafted for Africa</span>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
        </div>
        
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
          Manage Your Branches, Staff & Sales with <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">ShopAI</span>
        </h1>
        
        <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
          Cloud-based POS barcode scanning for your cashiers, multi-branch tracking for you, and automated e-commerce web storefronts that send orders straight to the system.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6 max-w-md mx-auto">
          <Link 
            href="/signup" 
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold px-8 py-4 rounded-2xl shadow-xl shadow-blue-500/10 transition-all duration-300 hover:scale-[1.02] text-center tracking-wide text-sm"
          >
            Register Your Business
          </Link>
        </div>
      </div>

      {/* Footer Ecosystem Layout Strip */}
      <footer className="w-full max-w-6xl py-6 flex flex-col sm:flex-row justify-between items-center border-t border-white/5 backdrop-blur-xs text-xs text-slate-400 gap-3 z-10">
        <p>© 2026 ShopAI Platform Systems. All Rights Reserved.</p>
        <div className="flex gap-4 font-semibold">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Core Cloud Connected
          </span>
          <span className="text-slate-500">v1.0.0-Beta</span>
        </div>
      </footer>
    </div>
  )
}
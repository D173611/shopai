'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/app/utils/supabase/client'

export default function ShareCashierLink({ shopId }: { shopId: string }) {
  const [copied, setCopied] = useState(false)
  const [cashierLoginLink, setCashierLoginLink] = useState('')
  const [shopSlug, setShopSlug] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchShopSlug = async () => {
      const supabase = createClient()
      const { data: shop, error } = await supabase
       .from('shops')
       .select('slug, name')
       .eq('id', shopId)
       .single()

      if (error ||!shop?.slug) {
        console.error('Failed to fetch shop:', error)
        setCashierLoginLink('Error: Shop not found')
        setLoading(false)
        return
      }

      setShopSlug(shop.slug)

      // Use NEXT_PUBLIC_SITE_URL in production, fallback to window.location.origin
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
      setCashierLoginLink(`${baseUrl}/${shop.slug}/cashier-login`)
      setLoading(false)
    }

    if (shopId) fetchShopSlug()
  }, [shopId])

  const copyLink = async () => {
    if (!cashierLoginLink || loading || cashierLoginLink.startsWith('Error')) return
    try {
      await navigator.clipboard.writeText(cashierLoginLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
      // Fallback for older browsers
      prompt('Copy this link:', cashierLoginLink)
    }
  }

  return (
    <div className="bg-white/70 backdrop-blur-xl p-6 rounded-2xl border border-white/30 shadow-xl space-y-4">
      <div className="flex items-center space-x-2 text-blue-600">
        <span className="text-xl">🔐</span>
        <h3 className="font-bold text-base text-slate-800">Cashier Login Access</h3>
      </div>
      <p className="text-xs text-slate-600">
        Share this link with your cashiers for <span className="font-bold">{shopSlug || 'your shop'}</span>.
        They'll use their name + password to access the POS terminal.
      </p>

      <div className="flex gap-3">
        <input
          value={loading? 'Fetching shop link...' : cashierLoginLink}
          readOnly
          className="flex-1 bg-white/50 border border-white/30 rounded-xl p-3 text-sm text-slate-700 font-mono outline-none"
        />
        <button
          onClick={copyLink}
          disabled={loading ||!cashierLoginLink || cashierLoginLink.startsWith('Error')}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold px-5 rounded-xl transition text-sm"
        >
          {copied? 'Copied!' : 'Copy Link'}
        </button>
      </div>

      <div className="bg-amber-50/70 backdrop-blur border border-amber-200/50 p-3 rounded-xl">
        <p className="text-xs text-amber-700 font-semibold">
          ⚠️ Create cashier accounts first in "Manage Staff" before sharing this link
        </p>
      </div>
    </div>
  )
}
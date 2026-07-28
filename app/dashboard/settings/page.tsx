import { createClient } from '@/app/utils/supabase/server'
import { redirect } from 'next/navigation'
import SettingsForm from './SettingsForm'
import { createShopForUser } from './actions'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser() // FIXED HERE
  if (!user) return redirect('/login')

  const { data: link } = await supabase
    .from('user_shops')
    .select('shop_id')
    .eq('user_id', user.id)
    .maybeSingle()

  let shop: any = null
  let shopId: string

  if (link && link.shop_id) { // fixed: check link first
    shopId = link.shop_id
  } else {
    const { data: ownedShop } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (ownedShop) { // fixed: check ownedShop first
      shopId = ownedShop.id
      await supabase.from('user_shops').insert({
        user_id: user.id,
        shop_id: shopId
      })
    } else {
      const newShop = await createShopForUser(user)
      shopId = newShop.id
    }
  }

  // 1. Get shop data
  const { data: shopData } = await supabase
    .from('shops')
    .select('*')
    .eq('id', shopId)
    .single()
  shop = shopData

  // 2. Get settings data SEPARATELY
  const { data: settingsData } = await supabase
    .from('shop_settings')
    .select('price_per_km')
    .eq('shop_id', shopId)
    .maybeSingle()

  const price_per_km = settingsData?.price_per_km ?? 1000

  if (!shop) return <div className="p-6 text-white">Error creating shop. Contact support.</div>

  return (
    <div className="min-h-screen p-6 bg-transparent">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white drop-shadow-lg">Shop Settings</h1>
          <p className="text-slate-200 drop-shadow mt-1">This info shows on your public store page</p>
        </div>
        <SettingsForm shop={shop} price_per_km={price_per_km} />
      </div>
    </div>
  )
}
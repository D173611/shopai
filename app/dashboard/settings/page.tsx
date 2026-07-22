import { createClient } from '@/app/utils/supabase/server'
import { redirect } from 'next/navigation'
import SettingsForm from './SettingsForm'
import { createShopForUser } from './actions'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const { data: link } = await supabase
    .from('user_shops')
    .select('shop_id')
    .eq('user_id', user.id)
    .maybeSingle()

  let shop = null

  if (link?.shop_id) {
    const { data } = await supabase
      .from('shops')
      .select('*')
      .eq('id', link.shop_id)
      .single()
    shop = data
  } else {
    const { data: ownedShop } = await supabase
      .from('shops')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (ownedShop) {
      await supabase.from('user_shops').insert({
        user_id: user.id,
        shop_id: ownedShop.id
      })
      shop = ownedShop
    } else {
      shop = await createShopForUser(user)
    }
  }

  if (!shop) return <div className="p-6 text-white">Error creating shop. Contact support.</div>

  return (
    <div className="min-h-screen p-6 bg-transparent"> {/* ← CHANGED THIS */}
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white drop-shadow-lg">Shop Settings</h1> {/* ← CHANGED THIS */}
          <p className="text-slate-200 drop-shadow mt-1">This info shows on your public store page</p> {/* ← CHANGED THIS */}
        </div>
        <SettingsForm shop={shop} />
      </div>
    </div>
  )
}
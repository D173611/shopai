'use server'
import { createClient } from '@/app/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateShopSettings(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const shopId = formData.get('shopId') as string
  const shopSlug = formData.get('shopSlug') as string
  const location = formData.get('location') as string
  const contact_info = formData.get('contact_info') as string
  const shop_lat = formData.get('shop_lat') as string
  const shop_lng = formData.get('shop_lng') as string
  const price_per_km = formData.get('price_per_km') as string

  // Parse payment_methods from JSON string
  const paymentMethodsJson = formData.get('payment_methods') as string
  let payment_methods: { name: string, details: string }[] = []
  if (paymentMethodsJson) {
    try {
      payment_methods = JSON.parse(paymentMethodsJson)
    } catch (e) {
      console.error('Failed to parse payment_methods:', e)
      payment_methods = []
    }
  }

  // 0. VERIFY: Make sure this shop actually belongs to the logged in user
  // This prevents RLS from failing on shop_settings because the shop doesn't exist for this user
  const { data: shopCheck, error: checkError } = await supabase
    .from('shops')
    .select('id')
    .eq('id', shopId)
    .eq('owner_id', user.id)
    .single()
  
  if (checkError || !shopCheck) throw new Error('You do not own this shop')

  // 1. Update shops table
  const { error: shopError } = await supabase
    .from('shops')
    .update({
      location,
      contact_info,
      payment_methods,
      shop_lat: shop_lat ? Number(shop_lat) : null,
      shop_lng: shop_lng ? Number(shop_lng) : null,
    })
    .eq('id', shopId)

  if (shopError) throw new Error(`Failed to update shop: ${shopError.message}`)

  // 2. Update shop_settings table - with full error logging
  const { error: settingsError } = await supabase
    .from('shop_settings')
    .upsert({
      shop_id: shopId,
      price_per_km: price_per_km ? Number(price_per_km) : 1000,
    }, { onConflict: 'shop_id' })

  if (settingsError) {
    console.error("SUPABASE SETTINGS ERROR:", settingsError) // This will show in Vercel logs
    throw new Error(`Failed to update settings: ${settingsError.message} | Code: ${settingsError.code} | Hint: ${settingsError.hint}`)
  }

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard')
  revalidatePath(`/${shopSlug}`) // Revalidate public shop page so price updates instantly
}

export async function createShopForUser(user: any) {
  const supabase = await createClient()

  const emailName = user.email?.split('@')[0] || 'user'
  const shopName = `${emailName}'s Shop`
  const slug = shopName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString().slice(-4)

  // 1. Create shop
  const { data: shop, error: shopError } = await supabase
    .from('shops')
    .insert({
      name: shopName,
      slug,
      owner_id: user.id
    })
    .select()
    .single()

  if (shopError) throw new Error(`Shop creation failed: ${shopError.message}`)

  // 2. Link user to shop
  const { error: linkError } = await supabase
    .from('user_shops')
    .insert({
      user_id: user.id,
      shop_id: shop.id
    })

  if (linkError) throw new Error(`Link creation failed: ${linkError.message}`)

  // 3. Create default shop_settings - NEW
  const { error: settingsError } = await supabase
    .from('shop_settings')
    .insert({
      shop_id: shop.id,
      price_per_km: 1000 // default 1000 UGX per km
    })

  if (settingsError) console.error('Failed to create shop_settings:', settingsError)

  return shop
}
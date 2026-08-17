'use server'
import { createClient } from '@/app/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function updateShopSettings(formData: FormData) {
  const supabase = await createClient()
  const { data, error: authError } = await supabase.auth.getUser() // FIX 1
  if (authError || !data.user) throw new Error('Not authenticated')
  const user = data.user

  const shopId = formData.get('shopId') as string
  const shopSlug = formData.get('shopSlug') as string
  
  const location = formData.get('location') as string
  const contact_info = formData.get('contact_info') as string
  const shop_lat = formData.get('shop_lat') as string
  const shop_lng = formData.get('shop_lng') as string
  const price_per_km = formData.get('price_per_km') as string
  const tin_number = formData.get('tin_number') as string
  const logo_url_input = formData.get('logo_url') as string
  const logoFile = formData.get('logo') as File

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

  // HANDLE FILE UPLOAD
  let final_logo_url = logo_url_input
  if (logoFile && logoFile.size > 0) {
    const bytes = await logoFile.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'logos')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const filename = `${shopId}-${Date.now()}-${logoFile.name}`
    const filepath = join(uploadDir, filename)
    await writeFile(filepath, buffer)
    
    final_logo_url = `/uploads/logos/${filename}`
  }

  // 0. VERIFY
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
      logo_url: final_logo_url || null,
      tin_number: tin_number || null,
    })
    .eq('id', shopId)

  if (shopError) throw new Error(`Failed to update shop: ${shopError.message}`) // FIX 2

  // 2. Update shop_settings table
  const { error: settingsError } = await supabase
    .from('shop_settings')
    .upsert({
      shop_id: shopId,
      price_per_km: price_per_km ? Number(price_per_km) : 1000,
    }, { onConflict: 'shop_id' })

  if (settingsError) {
    console.error("SUPABASE SETTINGS ERROR:", settingsError)
    throw new Error(`Failed to update settings: ${settingsError.message}`) // FIX 3
  }

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard')
  revalidatePath(`/${shopSlug}`)
}

export async function createShopForUser(user: any) {
  const supabase = await createClient()

  const emailName = user.email?.split('@')[0] || 'user'
  const shopName = `${emailName}'s Shop`
  const slug = shopName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString().slice(-4)

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

  const { error: linkError } = await supabase
    .from('user_shops')
    .insert({
      user_id: user.id,
      shop_id: shop.id
    })

  if (linkError) throw new Error(`Link creation failed: ${linkError.message}`)

  const { error: settingsError } = await supabase
    .from('shop_settings')
    .insert({
      shop_id: shop.id,
      price_per_km: 1000
    })

  if (settingsError) console.error('Failed to create shop_settings:', settingsError)

  return shop
}
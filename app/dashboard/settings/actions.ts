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

  const { error } = await supabase
   .from('shops')
   .update({ location, contact_info, payment_methods })
   .eq('id', shopId)
   .eq('owner_id', user.id) // Security: only owner can update

  if (error) throw new Error(`Failed to update shop settings: ${error.message}`)

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard')
  revalidatePath(`/${shopSlug}`) // Revalidate public shop page
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

  return shop
}
'use server'

import { createClient } from '../../utils/supabase/server'
import { redirect } from 'next/navigation'

export async function signup(formData: FormData) {
  const supabase = await createClient()
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const shopName = formData.get('shopName') as string
  const slug = formData.get('slug') as string

  if (!email || !password || !shopName || !slug) {
    return redirect('/signup?error=All fields are required')
  }

  if (password.length < 6) {
    return redirect('/signup?error=Password must be at least 6 characters long')
  }

  const cleanSlug = slug.trim().toLowerCase()
  console.log("1. STARTING SIGNUP FOR:", email)

  // 1. Sign up the user
  const { data: authData, error: authError } = await supabase.auth.signUp({ 
    email, 
    password,
  })
  
  if (authError || !authData.user) {
    console.log("❌ AUTH ERROR:", authError)
    return redirect(`/signup?error=${encodeURIComponent(authError?.message || 'Authentication failed')}`)
  }
  console.log("2. USER CREATED:", authData.user.id)

  // 2. Check if slug is already taken
  const { data: existingShop } = await supabase
    .from('shops')
    .select('slug')
    .eq('slug', cleanSlug)
    .maybeSingle()

  if (existingShop) {
    return redirect('/signup?error=This store URL is already taken')
  }

  // 3. Create the shop
  console.log("3. CREATING SHOP FOR USER:", authData.user.id)
  const { data: shop, error: shopError } = await supabase.from('shops').insert({
    owner_id: authData.user.id,
    name: shopName,
    slug: cleanSlug,
    is_active: true
  }).select().single()

  if (shopError) {
    console.log("❌ SHOP CREATE ERROR:", shopError)
    return redirect(`/signup?error=${encodeURIComponent(shopError.message)}`)
  }
  console.log("4. SHOP CREATED:", shop.id)

  // 4. Auto-add owner as admin staff
  console.log("5. ADDING TO STAFF:", shop.id, authData.user.id)
  const { error: staffError } = await supabase.from('staff_members').insert({
    shop_id: shop.id,
    user_id: authData.user.id,
    role: 'admin' // <-- FIXED: 'admin' is allowed by your constraint
  })

  if (staffError) {
    console.log("❌ STAFF ERROR:", staffError)
    // Don't block redirect, but log it
  } else {
    console.log("✅ STAFF ADDED SUCCESSFULLY")
  }

  // 5. Redirect straight to dashboard
  return redirect('/dashboard?success=Shop created successfully')
}
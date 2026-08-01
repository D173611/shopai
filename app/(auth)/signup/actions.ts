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

  // 1. Sign up the user
  const { data: authData, error: authError } = await supabase.auth.signUp({ 
    email, 
    password,
  })
  
  if (authError || !authData.user) {
    return redirect(`/signup?error=${encodeURIComponent(authError?.message || 'Authentication failed')}`)
  }

  // 2. Check if slug is already taken
  const { data: existingShop } = await supabase
    .from('shops')
    .select('slug')
    .eq('slug', cleanSlug)
    .single()

  if (existingShop) {
    return redirect('/signup?error=This store URL is already taken')
  }

  // 3. IMMEDIATELY create the shop because email confirm is OFF
  const { error: shopError } = await supabase.from('shops').insert({
    owner_id: authData.user.id,
    name: shopName,
    slug: cleanSlug,
    is_active: true
  })

  if (shopError) {
    console.log("❌ DETAILED DATABASE ERROR LOG:", shopError)
    return redirect(`/signup?error=${encodeURIComponent(shopError.message)}`)
  }

  // 4. Redirect straight to dashboard - user is already logged in
  return redirect('/dashboard?success=Shop created successfully')
}
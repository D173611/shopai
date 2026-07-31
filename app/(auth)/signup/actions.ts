'use server'
import { createClient } from '../../utils/supabase/server'
import { redirect } from 'next/navigation'

export async function signup(formData: FormData) {
  const supabase = await createClient()
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const shopName = formData.get('shopName') as string
  const slug = formData.get('slug') as string

  if (password.length < 6) {
    return redirect('/signup?error=Password must be at least 6 characters long')
  }

  const cleanSlug = slug.trim().toLowerCase()

  // 1. Sign up the user + save shop data in metadata temporarily
  const { data: authData, error: authError } = await supabase.auth.signUp({ 
    email, 
    password,
    options: {
      data: {
        shop_name: shopName,
        shop_slug: cleanSlug,
        onboarding_complete: false // flag so we know to create shop later
      }
    }
  })
  
  if (authError || !authData.user) {
    return redirect(`/signup?error=${encodeURIComponent(authError?.message || 'Authentication failed')}`)
  }

  // 2. DON'T create shop here anymore. Wait until they confirm email
  return redirect('/signup?success=true')
}

// NEW: Run this after user clicks email link and logs in
export async function completeOnboarding() {
  const supabase = await createClient()
  
  // FIXED: this is how you get user in server actions
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return redirect('/login?error=Please login first')
  }

  // Skip if already done
  if (user.user_metadata?.onboarding_complete) {
    return redirect('/dashboard')
  }

  const shopName = user.user_metadata?.shop_name as string
  const shopSlug = user.user_metadata?.shop_slug as string

  if (!shopName || !shopSlug) {
    return redirect('/dashboard?error=Missing shop info')
  }

  // 3. NOW create the shop - user is confirmed so FK will pass
  const { error: shopError } = await supabase.from('shops').insert({
    owner_id: user.id,
    name: shopName,
    slug: shopSlug
  })

  if (shopError) {
    console.log("❌ DETAILED DATABASE ERROR LOG:", shopError)
    return redirect(`/dashboard?error=${encodeURIComponent(shopError.message)}`)
  }

  // 4. Mark onboarding as done so it doesn't run twice
  await supabase.auth.updateUser({
    data: { onboarding_complete: true }
  })

  return redirect('/dashboard?success=Shop created successfully')
}
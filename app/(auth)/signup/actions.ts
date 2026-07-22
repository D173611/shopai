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

  // 1. Sign up the user inside Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
  
  if (authError || !authData.user) {
    return redirect(`/signup?error=${encodeURIComponent(authError?.message || 'Authentication failed')}`)
  }

  // 2. Direct Slug Entry (No strict regex filtering to prevent empty parameters)
  const cleanSlug = slug.trim().toLowerCase()

  // 3. Save directly to the shops table
  const { error: shopError } = await supabase.from('shops').insert({
    owner_id: authData.user.id,
    name: shopName,
    slug: cleanSlug
  })

  if (shopError) {
    // CRITICAL: This will print the EXACT database issue directly into your VS Code terminal!
    console.log("❌ DETAILED DATABASE ERROR LOG:", shopError)
    return redirect(`/signup?error=${encodeURIComponent(shopError.message)}`)
  }

  return redirect('/dashboard')
}

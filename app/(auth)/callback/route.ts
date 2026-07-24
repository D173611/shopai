import { NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'  // ← Note the /app/

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(`${origin}/login?confirmed=true`)
    }
  }

  // Return to login if error
  return NextResponse.redirect(`${origin}/login?error=Could not confirm email`)
}
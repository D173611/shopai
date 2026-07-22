import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function nameToCashierEmail(name: string, shopId: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '')
  return `${slug}.${shopId.slice(0, 8)}@shop.cashier`
}

export async function POST(request: Request) {
  const { name, pin } = await request.json()
  
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role bypasses RLS
  )

  // Get all shop IDs - service role can do this
  const { data: shops } = await supabaseAdmin.from('shops').select('id')
  
  if (!shops?.length) {
    return NextResponse.json({ error: 'No shops found' }, { status: 404 })
  }

  // Check which shop this cashier belongs to
  const { data: users } = await supabaseAdmin.auth.admin.listUsers()
  
  for (const shop of shops) {
    const email = nameToCashierEmail(name, shop.id)
    const userExists = users.users.some(u => u.email === email)
    if (userExists) {
      return NextResponse.json({ email })
    }
  }

  return NextResponse.json({ error: 'Cashier not found' }, { status: 404 })
}
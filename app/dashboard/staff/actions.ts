'use server'
import { createClient } from '@/app/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'

// Helper: convert "John Mukasa" -> "john.mukasa.a1b2c3d4@shop.cashier"
function nameToCashierEmail(name: string, shopId: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '')
  return `${slug}.${shopId.slice(0, 8)}@shop.cashier`
}

export async function handleRegisterCashier(formData: FormData) {
  const supabaseServer = await createClient()

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: { user: activeUser } } = await supabaseServer.auth.getUser()
  if (!activeUser) return redirect('/login?error=Not logged in')

  const { data: currentShop, error: shopErr } = await supabaseServer
    .from('shops')
    .select('id')
    .eq('owner_id', activeUser.id)
    .maybeSingle()

  if (shopErr || !currentShop) {
    return redirect(`/dashboard/staff?error=${encodeURIComponent('Shop not found')}`)
  }

  const name = (formData.get('name') as string)?.trim()
  const pin = formData.get('pin') as string
  const branchId = formData.get('branchId') as string || null

  if (!name || !pin) {
    return redirect('/dashboard/staff?error=Name and PIN required')
  }

  if (pin.length < 4) {
    return redirect('/dashboard/staff?error=PIN must be at least 4 digits')
  }

  const email = nameToCashierEmail(name, currentShop.id)

  // 1. Create real Supabase Auth user
  const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: pin,
    email_confirm: true,
    user_metadata: {
      name,
      role: 'cashier',
      shop_id: currentShop.id,
      display_name: name
    }
  })

  if (authError) {
    console.error('Auth user creation failed:', authError)
    return redirect(`/dashboard/staff?error=${encodeURIComponent('Auth: ' + authError.message)}`)
  }

  // 2. Link to staff_members
  const { error: staffError } = await supabaseServer.from('staff_members').insert([{
    user_id: newAuthUser.user.id,
    shop_id: currentShop.id,
    branch_id: branchId,
    role: 'cashier'
  }])

  if (staffError) {
    await supabaseAdmin.auth.admin.deleteUser(newAuthUser.user.id)
    return redirect(`/dashboard/staff?error=${encodeURIComponent('Staff link: ' + staffError.message)}`)
  }

  revalidatePath('/dashboard/staff')
  redirect(`/dashboard/staff?success=${encodeURIComponent(`Cashier added. Login: ${name} / ${pin}`)}`)
}

export async function toggleCashierStatus(formData: FormData) {
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const cashierId = formData.get('id') as string
  const currentStatus = formData.get('currentStatus') === 'true'

  const { error } = await supabaseAdmin.auth.admin.updateUserById(cashierId, {
    ban_duration: currentStatus ? '876000h' : 'none'
  })

  if (error) throw new Error(`Update failed: ${error.message}`)
  revalidatePath('/dashboard/staff')
}

export async function deleteCashier(formData: FormData) {
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const cashierId = formData.get('id') as string

  const { error } = await supabaseAdmin.auth.admin.deleteUser(cashierId)
  if (error) throw new Error(`Delete failed: ${error.message}`)
  revalidatePath('/dashboard/staff')
}

export async function changeCashierPassword(formData: FormData) {
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const cashierId = formData.get('id') as string
  const newPassword = formData.get('newPassword') as string

  if (!newPassword || newPassword.length < 4) {
    throw new Error('PIN must be at least 4 characters')
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(cashierId, {
    password: newPassword
  })

  if (error) throw new Error(`PIN update failed: ${error.message}`)
  revalidatePath('/dashboard/staff')
}
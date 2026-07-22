'use server'
import { createClient } from '@/app/utils/supabase/server'
import bcrypt from 'bcryptjs'

export async function verifyCashierLogin(name: string, password: string) {
  const supabase = await createClient()
  
  const { data: cashier, error } = await supabase
    .from('cashiers')
    .select('id, name, password_hash, shop_id, is_active, shops(name)')
    .eq('name', name.trim())
    .eq('is_active', true)
    .single()

  if (error || !cashier) {
    return { error: 'Invalid name or password' }
  }

  const valid = await bcrypt.compare(password, cashier.password_hash)
  if (!valid) {
    return { error: 'Invalid name or password' }
  }

  return {
    error: null,
    cashier: {
      cashierId: cashier.id,
      cashierName: cashier.name,
      shopId: cashier.shop_id,
      shopName: (cashier.shops as any)?.name || 'Shop'
    }
  }
}
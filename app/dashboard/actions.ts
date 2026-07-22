'use server'

import { createClient } from '@/app/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitSubscriptionPayment(prevState: any, formData: FormData) {
  const supabase = await createClient()
  const transactionId = formData.get('transactionId') as string

  if (!transactionId?.trim()) {
    return { success: false, error: "Transaction ID is required" }
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "Unauthorized session" }
  }

  const { error: updateError } = await supabase
    .from('shops')
    .update({
      last_transaction_id: transactionId.trim(),
      payment_status: 'pending_approval'
    })
    .eq('owner_id', user.id)

  if (updateError) {
    return { success: false, error: updateError.message }
  }
  
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/billing')
  return { success: true }
}
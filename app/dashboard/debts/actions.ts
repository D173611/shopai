'use server'
import { createClient } from '@/app/utils/supabase/server'
import { revalidatePath } from 'next/cache'

type DebtItemInput = {
  productId?: string
  productName: string
  quantity: number
  unitPrice: number
}

export async function recordNewDebt(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
  if (!shop) throw new Error('Shop not found')

  const customerName = formData.get('customerName') as string
  const customerPhone = formData.get('customerPhone') as string
  const installmentType = formData.get('installmentType') as string
  const installmentAmount = Number(formData.get('installmentAmount')) || 0
  const notes = formData.get('notes') as string

  const items: DebtItemInput[] = []
  let i = 0
  while (formData.has(`items[${i}].productName`)) {
    const productName = formData.get(`items[${i}].productName`) as string
    const quantity = Number(formData.get(`items[${i}].quantity`))
    const unitPrice = Number(formData.get(`items[${i}].unitPrice`))
    const productId = formData.get(`items[${i}].productId`) as string

    if (productName && quantity > 0 && unitPrice > 0) {
      items.push({ productName, quantity, unitPrice, productId: productId || undefined })
    }
    i++
  }

  if (!customerName ||!customerPhone || items.length === 0) {
    throw new Error('Customer info and at least 1 item required')
  }

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

  for (const item of items) {
    if (item.productId) {
      const { data: product } = await supabase.from('products').select('stock_quantity').eq('id', item.productId).single()
      if (!product || product.stock_quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${item.productName}`)
      }
    }
  }

  const getNextDueDate = (type: string) => {
    const date = new Date()
    switch (type) {
      case 'daily': date.setDate(date.getDate() + 1); break
      case 'weekly': date.setDate(date.getDate() + 7); break
      case 'monthly': date.setMonth(date.getMonth() + 1); break
      case 'yearly': date.setFullYear(date.getFullYear() + 1); break
      default: return null
    }
    return date.toISOString().split('T')[0]
  }

  const { data: existingDebt } = await supabase
 .from('customer_debts')
 .select('*')
 .eq('shop_id', shop.id)
 .eq('customer_phone', customerPhone)
 .eq('status', 'active')
 .maybeSingle()

  let debtId: string
  if (existingDebt) {
    await supabase.from('customer_debts').update({
      total_debt_amount: Number(existingDebt.total_debt_amount) + totalAmount,
      installment_type: installmentType,
      installment_amount: installmentAmount,
      next_due_date: getNextDueDate(installmentType),
      notes: notes || existingDebt.notes,
      last_updated: new Date().toISOString()
    }).eq('id', existingDebt.id)
    debtId = existingDebt.id
  } else {
    const { data: newDebt, error } = await supabase.from('customer_debts').insert({
      shop_id: shop.id,
      customer_name: customerName,
      customer_phone: customerPhone,
      total_debt_amount: totalAmount,
      paid_amount: 0,
      installment_type: installmentType,
      installment_amount: installmentAmount,
      next_due_date: getNextDueDate(installmentType),
      status: 'active',
      notes,
      stock_deducted: false
    }).select().single()

    if (error) throw new Error(error.message)
    debtId = newDebt.id
  }

  const debtItems = items.map(item => ({
    debt_id: debtId,
    product_id: item.productId || null,
    product_name: item.productName,
    quantity: item.quantity,
    unit_price: item.unitPrice
  }))

  await supabase.from('debt_items').insert(debtItems)
  revalidatePath('/dashboard/debts')
}

export async function settleDebt(formData: FormData) {
  const supabase = await createClient()
  const debtId = formData.get('debtId') as string
  const paymentAmount = Number(formData.get('paymentAmount'))

  const { data: debt } = await supabase.from('customer_debts').select('*, debt_items(*)').eq('id', debtId).single()
  if (!debt) throw new Error('Debt not found')

  const newPaidAmount = Number(debt.paid_amount) + paymentAmount
  const balance = Number(debt.total_debt_amount) - newPaidAmount

  if (balance <= 0) {
    await supabase.from('customer_debts').update({
      paid_amount: debt.total_debt_amount,
      status: 'cleared',
      stock_deducted: true,
      last_updated: new Date().toISOString()
    }).eq('id', debtId)

    for (const item of debt.debt_items) {
      if (item.product_id) {
        const { error } = await supabase.rpc('decrement_stock', {
          product_id_param: item.product_id,
          quantity_param: item.quantity
        })
        if (error) {
          const { data: product } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single()
          if (product) {
            await supabase.from('products').update({
              stock_quantity: product.stock_quantity - item.quantity
            }).eq('id', item.product_id)
          }
        }
      }
    }

    await supabase.from('orders').insert({
      shop_id: debt.shop_id,
      customer_name: debt.customer_name,
      customer_phone: debt.customer_phone,
      total_amount: debt.total_debt_amount,
      payment_method: 'credit_cleared',
      status: 'completed'
    })
  } else {
    const getNextDueDate = (type: string) => {
      const date = new Date()
      switch (type) {
        case 'daily': date.setDate(date.getDate() + 1); break
        case 'weekly': date.setDate(date.getDate() + 7); break
        case 'monthly': date.setMonth(date.getMonth() + 1); break
        case 'yearly': date.setFullYear(date.getFullYear() + 1); break
        default: return null
      }
      return date.toISOString().split('T')[0]
    }

    await supabase.from('customer_debts').update({
      paid_amount: newPaidAmount,
      next_due_date: getNextDueDate(debt.installment_type),
      last_updated: new Date().toISOString()
    }).eq('id', debtId)
  }

  revalidatePath('/dashboard/debts')
}

export async function cancelDebtAndRestock(formData: FormData) {
  const supabase = await createClient()
  const debtId = formData.get('debtId') as string
  const reason = formData.get('reason') as string || 'Product returned'

  const { data: debt } = await supabase.from('customer_debts').select('*, debt_items(*)').eq('id', debtId).single()
  if (!debt) throw new Error('Debt not found')
  if (debt.status === 'cancelled') throw new Error('Debt already cancelled')
  if (debt.status === 'cleared') throw new Error('Cannot cancel a cleared debt. Stock was already deducted.')

  // Only restock if stock wasn't deducted yet
  if (!debt.stock_deducted) {
    for (const item of debt.debt_items) {
      if (item.product_id) {
        const { data: product } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single()
        if (product) {
          await supabase.from('products').update({
            stock_quantity: product.stock_quantity + item.quantity
          }).eq('id', item.product_id)
        }
      }
    }
  }

  // Mark debt as cancelled
  await supabase.from('customer_debts').update({
    status: 'cancelled',
    notes: `${debt.notes || ''}\n[CANCELLED]: ${reason} - ${new Date().toLocaleDateString()}`,
    last_updated: new Date().toISOString()
  }).eq('id', debtId)

  revalidatePath('/dashboard/debts')
}

export async function deleteClearedDebt(formData: FormData) {
  const supabase = await createClient()
  const debtId = formData.get('debtId') as string
  await supabase.from('customer_debts').delete().eq('id', debtId)
  revalidatePath('/dashboard/debts')
}
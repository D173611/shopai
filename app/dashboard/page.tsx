import { createClient } from '../utils/supabase/server'
import { createAdminClient } from '../utils/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import CheckoutPanel from './CheckoutPanel'
import ProductImage from './ProductImage'
import ShareCashierLink from './ShareCashierLink'
import Link from 'next/link'
import { SubscriptionLockScreen, ExpiringSoonBanner } from './SubscriptionBanner'
import { Product, Branch, Order } from './types'
import DashboardClient from './DashboardClient'

// ACTION 1: Create Branch
async function createBranch(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const name = formData.get('branchName') as string
  const location = formData.get('location') as string
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const { data: shop, error: shopError } = await supabase
  .from('shops')
  .select('id')
  .eq('owner_id', user.id)
  .maybeSingle()

  if (shopError ||!shop) throw new Error('Shop not found')

  const { error } = await supabase
  .from('branches')
  .insert({ shop_id: shop.id, name, location })

  if (error) {
    console.error("Supabase Branch Error:", error)
    throw new Error(`Branch Insert Failed: ${error.message}`)
  }

  revalidatePath('/dashboard')
}

// ACTION 2: Add Product with Multiple Images
async function addProduct(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const name = formData.get('name') as string
  const cost = parseFloat(formData.get('costPrice') as string)
  const retail = parseFloat(formData.get('retailPrice') as string)
  const stock = parseInt(formData.get('stockQuantity') as string)
  const threshold = parseInt(formData.get('lowStockThreshold') as string) || 5
  const barcodeQty = parseInt(formData.get('barcodeQty') as string) || 1

  const imageFiles = formData.getAll('productImages') as File[]
  const rawAiEnhancedUrl = formData.get('imageUrlAiEnhanced') as string || ''
  const preferAi = formData.get('imagePreference') === 'ai'

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const { data: shop, error: shopError } = await supabase
  .from('shops')
  .select('id')
  .eq('owner_id', user.id)
  .maybeSingle()

  if (shopError ||!shop) throw new Error('Shop not found')

  const imageUrls: string[] = []
  for (const file of imageFiles) {
    if (file.size === 0) continue
    const fileName = `${shop.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

    const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(fileName, file)

    if (uploadError) {
      console.error("Image upload failed:", uploadError)
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(fileName)

    imageUrls.push(publicUrl)
  }

  const randomBarcode = 'SPAI-' + Math.floor(10000000 + Math.random() * 90000000)

  const { error } = await supabase.from('products').insert({
    shop_id: shop.id,
    name,
    barcode: randomBarcode,
    cost_price: cost,
    retail_price: retail,
    stock_quantity: stock,
    low_stock_threshold: threshold,
    image_url: imageUrls[0] || null,
    image_urls: imageUrls,
    image_url_ai_enhanced: rawAiEnhancedUrl || null,
    use_ai_enhanced: preferAi,
    barcode_print_qty: barcodeQty
  })

  if (error) {
    console.error("Supabase Error details:", error)
    throw new Error(`Supabase Insert Failed: ${error.message}`)
  }

  revalidatePath('/dashboard')
}

// DELETE ACTION
async function deleteProduct(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const productId = formData.get('id') as string

  const { error } = await supabase
  .from('products')
  .delete()
  .eq('id', productId)

  if (error) {
    console.error("Delete failed:", error)
    throw new Error(`Delete failed: ${error.message}`)
  }

  revalidatePath('/dashboard')
}

// UPDATE STOCK ACTION - NOW SUPPORTS BULK ADD
async function updateStock(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const productId = formData.get('id') as string
  const currentStock = parseInt(formData.get('currentStock') as string)
  const adjustment = parseInt(formData.get('adjustment') as string)

  const newStock = Math.max(0, currentStock + adjustment)

  const { error } = await supabase
  .from('products')
  .update({ stock_quantity: newStock })
  .eq('id', productId)

  if (error) {
    console.error("Stock update failed:", error)
    throw new Error(`Stock update failed: ${error.message}`)
  }

  revalidatePath('/dashboard')
}

// UPDATE PRICE ACTION
async function updatePrice(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const productId = formData.get('id') as string
  const field = formData.get('field') as 'cost_price' | 'retail_price'
  const newPrice = parseFloat(formData.get('newPrice') as string)

  if (isNaN(newPrice) || newPrice < 0) {
    throw new Error('Invalid price value')
  }

  const { error } = await supabase
  .from('products')
  .update({ [field]: newPrice })
  .eq('id', productId)

  if (error) {
    console.error("Price update failed:", error)
    throw new Error(`Price update failed: ${error.message}`)
  }

  revalidatePath('/dashboard')
}

// UPDATE BARCODE QTY ACTION
async function updateBarcodeQty(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const productId = formData.get('id') as string
  const qty = parseInt(formData.get('qty') as string)

  if (isNaN(qty) || qty < 1) {
    throw new Error('Invalid barcode quantity')
  }

  const { error } = await supabase
  .from('products')
  .update({ barcode_print_qty: qty })
  .eq('id', productId)

  if (error) {
    console.error("Barcode qty update failed:", error)
    throw new Error(`Barcode qty update failed: ${error.message}`)
  }

  revalidatePath('/dashboard')
}

// LOGOUT
async function logout() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  return redirect('/login')
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const supabaseAdmin = createAdminClient()

  const [{ data: shop, error: shopError }, { data: config }] = await Promise.all([
    supabase
    .from('shops')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle(),
    supabaseAdmin
    .from('founder_config')
    .select('*')
    .limit(1)
    .maybeSingle()
  ])

  if (shopError ||!shop) return redirect('/signup?error=No shop found')

  const now = new Date()
  const expiryDate = shop.subscription_ends_at || shop.trial_ends_at

  const daysRemaining = expiryDate
  ? Math.ceil((new Date(expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : -999

  const isExpired =!expiryDate || daysRemaining <= 0 || shop.payment_status === 'expired'

  if (isExpired) {
    return <SubscriptionLockScreen shop={shop} config={config} daysRemaining={daysRemaining} />
  }

  const { data: branches } = await supabase
  .from('branches')
  .select()
  .eq('shop_id', shop.id)
  .returns<Branch[]>()

  const { data: products } = await supabase
  .from('products')
  .select()
  .eq('shop_id', shop.id)
  .order('created_at', { ascending: false })

  const { data: orders } = await supabase
  .from('orders')
  .select()
  .eq('shop_id', shop.id)
  .returns<Order[]>()

  const { count: pendingOrdersCount } = await supabase
  .from('orders')
  .select('id', { count: 'exact', head: true })
  .eq('shop_id', shop.id)
  .eq('order_status', 'pending')
  .is('locked_by_cashier_id', null)

  const { count: activeDebtsCount } = await supabase
  .from('debts')
  .select('id', { count: 'exact', head: true })
  .eq('shop_id', shop.id)
  .eq('is_paid', false)

  const productList: Product[] = (products?? []).map(p => ({
  ...p,
    cost_price: Number(p.cost_price),
    retail_price: Number(p.retail_price),
    stock_quantity: Number(p.stock_quantity),
    low_stock_threshold: p.low_stock_threshold? Number(p.low_stock_threshold) : null,
    image_url: p.image_url || null,
    image_urls: p.image_urls || null,
    image_url_ai_enhanced: p.image_url_ai_enhanced || null,
    use_ai_enhanced: p.use_ai_enhanced || null,
    barcode_print_qty: p.barcode_print_qty || 1
  }))

  const totalSalesRevenue = orders?.reduce((sum: number, order: Order) => sum + Number(order.total_amount), 0) || 0
  const lowStockItems = productList?.filter((p: Product) => p.stock_quantity <= (p.low_stock_threshold || 5)) || []

  const branchList = branches?? []

  return (
    <DashboardClient
      shop={shop}
      config={config}
      daysRemaining={daysRemaining}
      branches={branchList}
      products={productList}
      pendingOrdersCount={pendingOrdersCount || 0}
      activeDebtsCount={activeDebtsCount || 0}
      totalSalesRevenue={totalSalesRevenue}
      lowStockItems={lowStockItems}
      user={user}
      createBranch={createBranch}
      addProduct={addProduct}
      deleteProduct={deleteProduct}
      updateStock={updateStock}
      updatePrice={updatePrice}
      updateBarcodeQty={updateBarcodeQty}
      logout={logout}
    />
  )
}
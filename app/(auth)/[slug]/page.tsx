import { createClient } from '../../utils/supabase/server'
import { notFound } from 'next/navigation'
import ShopClient from './ShopClient'

export default async function ShopPage({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const { slug } = await params
  console.log('=== DEBUG START ===')
  console.log('1. URL slug:', slug)
  
  const supabase = await createClient()

  const { data: shop, error: shopError } = await supabase
    .from('shops')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  console.log('2. DB returned shop:', shop)
  console.log('3. DB error:', shopError)
  console.log('=== DEBUG END ===')

  if (shopError) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <h1 className="text-2xl font-bold text-red-500">DATABASE ERROR</h1>
        <pre className="mt-4 bg-slate-800 p-4 rounded">Code: {shopError.code}</pre>
        <pre className="mt-2 bg-slate-800 p-4 rounded">Message: {shopError.message}</pre>
        <pre className="mt-2 bg-slate-800 p-4 rounded">Details: {shopError.details}</pre>
        <pre className="mt-2 bg-slate-800 p-4 rounded">Hint: {shopError.hint}</pre>
        <p className="mt-4">Looking for slug: {slug}</p>
      </div>
    )
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <h1 className="text-2xl font-bold text-yellow-500">SHOP NOT FOUND</h1>
        <p className="mt-4">No shop exists with slug: "{slug}"</p>
        <p className="mt-2">Check your shops table.</p>
      </div>
    )
  }

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('shop_id', shop.id)
    .gt('stock_quantity', 0)
    .limit(100)

  return <ShopClient shop={shop} products={products || []} />
}
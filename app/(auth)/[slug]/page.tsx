import { createClient } from '../../utils/supabase/server'
import { notFound } from 'next/navigation'
import ShopClient from './ShopClient'

export default async function ShopPage({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const { slug } = await params
  const supabase = await createClient()

  // 1. Fetch shop data (gets coordinates: shop_lat, shop_lng)
  const { data: shop, error: shopError } = await supabase
    .from('shops')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (shopError || !shop) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <h1 className="text-2xl font-bold text-red-500">SHOP NOT FOUND</h1>
        <p className="mt-4">No shop exists with slug: "{slug}"</p>
      </div>
    )
  }

  // 2. Fetch products
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('shop_id', shop.id)
    .gt('stock_quantity', 0)
    .limit(100)

  // 3. Fetch price_per_km from the shop_settings table using shop_id
  const { data: settings } = await supabase
    .from('shop_settings')
    .select('price_per_km, delivery_enabled')
    .eq('shop_id', shop.id)
    .maybeSingle()

  // 4. Merge everything cleanly for the client component
  const enhancedShop = {
    ...shop,
    latitude: shop.shop_lat,      // Mapped from public.shops
    longitude: shop.shop_lng,    // Mapped from public.shops
    price_per_km: settings?.price_per_km ?? 1000 // Pulled live from public.shop_settings
  }

  const pricePerKm = settings?.price_per_km || 1000

  return <ShopClient shop={enhancedShop} products={products || []} pricePerKm={pricePerKm} />
}
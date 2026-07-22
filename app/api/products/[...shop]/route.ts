import { createClient } from '../../../utils/supabase/server'
import { NextResponse } from 'next/server'

interface RouteProps {
  params: Promise<{ shop: string[] }>
}

export async function GET(request: Request, { params }: RouteProps) {
  const supabase = await createClient()
  
  // Await the catch-all array and grab first segment
  const { shop: shopSegments } = await params
  
  // DIAGNOSTIC LOG: This prints exactly what your app sees in your VS Code terminal
  console.log("=== API DEBUG SEGMENTS ===", shopSegments)

  // Safe fallback to read the first parameter string
  const targetSlug = Array.isArray(shopSegments)? shopSegments[0] : (shopSegments as any)

  if (!targetSlug) {
    return NextResponse.json({ 
      error: "Missing shop identifier", 
      debugReceived: shopSegments 
    }, { status: 400 })
  }

  const { data: shop, error: shopError } = await supabase
  .from('shops')
  .select('id, is_active')
  .eq('slug', targetSlug)
  .maybeSingle()

  if (shopError ||!shop) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 })
  }

  if (!shop.is_active) {
    return NextResponse.json({ error: "Store catalog locked" }, { status: 403 })
  }

  const { data: products, error: productError } = await supabase
  .from('products')
  .select('id, name, retail_price, image_url_original, image_url_ai_enhanced, use_ai_enhanced')
  .eq('shop_id', shop.id)
  .gt('stock_quantity', 0)

  if (productError) {
    console.error('Products fetch failed for shop:', targetSlug, productError)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }

  return NextResponse.json(
    { products }, 
    { 
      headers: { 
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'Access-Control-Allow-Origin': '*'
      } 
    }
  )
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
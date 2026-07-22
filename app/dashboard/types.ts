export type Product = {
  id: string
  name: string
  barcode: string | null
  cost_price: number
  retail_price: number
  stock_quantity: number
  low_stock_threshold: number | null
  image_url: string | null
  image_urls: string[] | null
  image_url_ai_enhanced: string | null
  use_ai_enhanced: boolean | null
  shop_id: string
  barcode_print_qty: number | null // ADD THIS
  created_at?: string
}

export type Branch = {
  id: string
  name: string
  location: string | null
  shop_id?: string // ADD THIS - used in queries
  created_at?: string
}

export type Order = {
  id: string
  total_amount: number | string
  shop_id?: string // ADD THIS - used in queries
  order_status?: string
  created_at?: string
}
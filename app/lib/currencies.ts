import { createClient } from '../utils/supabase/client'

type Currency = {
  currency_code: string
  currency_symbol: string
}

const supabase = createClient()
let CURRENCY_CACHE: Record<string, Currency> = {}

// Default currencies for all African countries + USA so PDF works instantly without waiting for Supabase
const DEFAULT_CURRENCIES: Record<string, Currency> = {
  // East Africa
  Uganda: { currency_code: 'UGX', currency_symbol: 'UGX' },
  Kenya: { currency_code: 'KES', currency_symbol: 'KSh' },
  Tanzania: { currency_code: 'TZS', currency_symbol: 'TSh' },
  Rwanda: { currency_code: 'RWF', currency_symbol: 'RWF' },
  Burundi: { currency_code: 'BIF', currency_symbol: 'FBu' },
  'South Sudan': { currency_code: 'SSP', currency_symbol: 'SSP' },
  Somalia: { currency_code: 'SOS', currency_symbol: 'Sh.So.' },
  Djibouti: { currency_code: 'DJF', currency_symbol: 'Fdj' },
  Eritrea: { currency_code: 'ERN', currency_symbol: 'Nfk' },
  Ethiopia: { currency_code: 'ETB', currency_symbol: 'Br' },

  // Southern Africa
  'South Africa': { currency_code: 'ZAR', currency_symbol: 'R' },
  Botswana: { currency_code: 'BWP', currency_symbol: 'P' },
  Namibia: { currency_code: 'NAD', currency_symbol: 'N$' },
  Zambia: { currency_code: 'ZMW', currency_symbol: 'ZK' },
  Zimbabwe: { currency_code: 'ZWL', currency_symbol: 'Z$' },
  Malawi: { currency_code: 'MWK', currency_symbol: 'MK' },
  Mozambique: { currency_code: 'MZN', currency_symbol: 'MT' },
  Eswatini: { currency_code: 'SZL', currency_symbol: 'E' },
  Lesotho: { currency_code: 'LSL', currency_symbol: 'L' },
  Angola: { currency_code: 'AOA', currency_symbol: 'Kz' },

  // West Africa
  Nigeria: { currency_code: 'NGN', currency_symbol: '₦' },
  Ghana: { currency_code: 'GHS', currency_symbol: 'GH₵' },
  Senegal: { currency_code: 'XOF', currency_symbol: 'CFA' },
  "Cote d'Ivoire": { currency_code: 'XOF', currency_symbol: 'CFA' },
  Mali: { currency_code: 'XOF', currency_symbol: 'CFA' },
  'Burkina Faso': { currency_code: 'XOF', currency_symbol: 'CFA' },
  Niger: { currency_code: 'XOF', currency_symbol: 'CFA' },
  Togo: { currency_code: 'XOF', currency_symbol: 'CFA' },
  Benin: { currency_code: 'XOF', currency_symbol: 'CFA' },
  'Guinea-Bissau': { currency_code: 'XOF', currency_symbol: 'CFA' },
  Liberia: { currency_code: 'LRD', currency_symbol: 'L$' },
  'Sierra Leone': { currency_code: 'SLL', currency_symbol: 'Le' },
  Guinea: { currency_code: 'GNF', currency_symbol: 'FG' },
  Gambia: { currency_code: 'GMD', currency_symbol: 'D' },
  'Cape Verde': { currency_code: 'CVE', currency_symbol: 'Esc' },

  // Central Africa
  Cameroon: { currency_code: 'XAF', currency_symbol: 'FCFA' },
  Gabon: { currency_code: 'XAF', currency_symbol: 'FCFA' },
  Congo: { currency_code: 'XAF', currency_symbol: 'FCFA' },
  'DR Congo': { currency_code: 'CDF', currency_symbol: 'FC' },
  'Central African Republic': { currency_code: 'XAF', currency_symbol: 'FCFA' },
  Chad: { currency_code: 'XAF', currency_symbol: 'FCFA' },
  'Equatorial Guinea': { currency_code: 'XAF', currency_symbol: 'FCFA' },
  'Sao Tome and Principe': { currency_code: 'STN', currency_symbol: 'Db' },

  // North Africa
  Egypt: { currency_code: 'EGP', currency_symbol: '£E' },
  Morocco: { currency_code: 'MAD', currency_symbol: 'DH' },
  Algeria: { currency_code: 'DZD', currency_symbol: 'DA' },
  Tunisia: { currency_code: 'TND', currency_symbol: 'DT' },
  Libya: { currency_code: 'LYD', currency_symbol: 'LD' },
  Sudan: { currency_code: 'SDG', currency_symbol: 'SDG' },
  Mauritania: { currency_code: 'MRU', currency_symbol: 'UM' },

  // Islands
  Madagascar: { currency_code: 'MGA', currency_symbol: 'Ar' },
  Mauritius: { currency_code: 'MUR', currency_symbol: 'Rs' },
  Seychelles: { currency_code: 'SCR', currency_symbol: '₨' },
  Comoros: { currency_code: 'KMF', currency_symbol: 'CF' },

  // Other
  USA: { currency_code: 'USD', currency_symbol: '$' },
}

export async function getCurrencyByCountry(country: string): Promise<Currency> {
  if (CURRENCY_CACHE[country]) return CURRENCY_CACHE[country]

  const { data, error } = await supabase
  .from('currencies')
  .select('currency_code, currency_symbol')
  .eq('country', country)
  .single()

  if (error) console.log('Currency fetch error:', error)

  const result: Currency = data || DEFAULT_CURRENCIES[country] || { currency_code: "USD", currency_symbol: "$" }
  CURRENCY_CACHE[country] = result
  return result
}

// ASYNC version - use this in server components like page.tsx
export async function formatCurrency(amount: number, country: string): Promise<string> {
  const { currency_symbol } = await getCurrencyByCountry(country)
  return `${currency_symbol} ${amount.toLocaleString()}`
}

// SYNC version - use this in client components like ReceiptButton.tsx
export function formatCurrencySync(amount: number, country: string): string {
  const currency = CURRENCY_CACHE[country] || DEFAULT_CURRENCIES[country] || { currency_code: "USD", currency_symbol: "$" }
  return `${currency.currency_symbol} ${amount.toLocaleString()}`
}

export async function getAllCountries(): Promise<string[]> {
  const { data } = await supabase.from('currencies').select('country').order('country')
  return data?.map((d: { country: string }) => d.country) || []
}
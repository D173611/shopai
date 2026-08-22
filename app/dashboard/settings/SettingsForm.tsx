'use client'
import { useState, useMemo } from 'react'
import { updateShopSettings } from './actions'

type PaymentMethod = { name: string, details: string }

type Shop = {
  id: string
  name: string
  slug: string
  location?: string | null
  country?: string | null // <-- ADDED THIS
  shop_lat?: number | null
  shop_lng?: number | null
  contact_info?: string | null
  payment_methods?: PaymentMethod[] | null
  logo_url?: string | null
  tin_number?: string | null
}

const ALL_COUNTRIES = [
  'Uganda', 'Kenya', 'Tanzania', 'Rwanda', 'Burundi', 'South Sudan', 'Somalia', 'Djibouti', 'Eritrea', 'Ethiopia',
  'South Africa', 'Botswana', 'Namibia', 'Zambia', 'Zimbabwe', 'Malawi', 'Mozambique', 'Eswatini', 'Lesotho', 'Angola',
  'Nigeria', 'Ghana', 'Senegal', "Cote d'Ivoire", 'Mali', 'Burkina Faso', 'Niger', 'Togo', 'Benin', 'Guinea-Bissau',
  'Liberia', 'Sierra Leone', 'Guinea', 'Gambia', 'Cape Verde',
  'Cameroon', 'Gabon', 'Congo', 'DR Congo', 'Central African Republic', 'Chad', 'Equatorial Guinea', 'Sao Tome and Principe',
  'Egypt', 'Morocco', 'Algeria', 'Tunisia', 'Libya', 'Sudan', 'Mauritania',
  'Madagascar', 'Mauritius', 'Seychelles', 'Comoros', 'USA'
]

export default function SettingsForm({
  shop,
  price_per_km
}: {
  shop: Shop,
  price_per_km: number
}) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(
    shop.payment_methods?.length? shop.payment_methods : [{ name: '', details: '' }]
  )
  const [country, setCountry] = useState(shop.country || 'Uganda') // <-- ADDED
  const [search, setSearch] = useState(shop.country || 'Uganda') // <-- ADDED
  const [showList, setShowList] = useState(false) // <-- ADDED

  const filteredCountries = useMemo(() =>
    ALL_COUNTRIES.filter(c =>
      c.toLowerCase().includes(search.toLowerCase())
    ), [search])

  const addPaymentMethod = () => {
    setPaymentMethods([...paymentMethods, { name: '', details: '' }])
  }

  const removePaymentMethod = (idx: number) => {
    setPaymentMethods(paymentMethods.filter((_, i) => i!== idx))
  }

  const updatePaymentMethod = (idx: number, field: 'name' | 'details', value: string) => {
    const updated = [...paymentMethods]
    updated[idx][field] = value
    setPaymentMethods(updated)
  }

  return (
    <form
      action={updateShopSettings}
      className="space-y-6 bg-slate-900 bg-opacity-80 backdrop-blur-md p-6 rounded-2xl border border-slate-700/50 shadow-xl"
    >
      <input type="hidden" name="shopId" value={shop.id} />
      <input type="hidden" name="shopSlug" value={shop.slug} />
      <input type="hidden" name="country" value={country} /> {/* <-- ADDED THIS */}

      <input
        type="hidden"
        name="payment_methods"
        value={JSON.stringify(paymentMethods.filter(pm => pm.name.trim() || pm.details.trim()))}
      />

      {/* COUNTRY SEARCH FIELD - NEW */}
      <div>
        <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
          Shop Country
        </label>
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => {setSearch(e.target.value); setShowList(true)}}
            onFocus={() => setShowList(true)}
            onBlur={() => setTimeout(() => setShowList(false), 200)}
            placeholder="Search your country..."
            className="w-full text-sm p-2.5 border border-slate-700 rounded-xl bg-slate-800 bg-opacity-80 outline-none focus:border-blue-500 focus:bg-slate-800 transition text-white placeholder:text-slate-400"
          />
          {showList && (
            <div className="absolute z-20 w-full bg-slate-800 border border-slate-700 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-2xl">
              {filteredCountries.length > 0? filteredCountries.map(c => (
                <div
                  key={c}
                  onMouseDown={() => {setCountry(c); setSearch(c); setShowList(false)}} // use onMouseDown so blur doesn't fire first
                  className="p-2 hover:bg-slate-700 cursor-pointer text-white text-sm"
                >
                  {c}
                </div>
              )) : <div className="p-2 text-slate-400 text-sm">No country found</div>}
            </div>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-1">This sets your receipt currency. e.g KSh, UGX, ₦</p>
      </div>

      {/* UPDATED: SHOP LOGO - UPLOAD OR URL */}
      <div>
        <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
          Shop Logo
        </label>
        {shop.logo_url && (
          <img src={shop.logo_url} alt="Current Logo" className="w-20 h-20 object-contain rounded-lg mb-2 border-slate-700" />
        )}
        <div className="space-y-2">
          <input
            type="file"
            name="logo"
            accept="image/*"
            className="w-full text-sm p-2.5 border border-slate-700 rounded-xl bg-slate-800 bg-opacity-80 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 text-white"
          />
          <p className="text-xs text-slate-400 text-center">OR</p>
          <input
            type="url"
            name="logo_url"
            defaultValue={shop.logo_url || ''}
            placeholder="https://example.com/logo.png"
            className="w-full text-sm p-2.5 border border-slate-700 rounded-xl bg-slate-800 bg-opacity-80 outline-none focus:border-blue-500 focus:bg-slate-800 transition text-white placeholder:text-slate-400"
          />
        </div>
        <p className="text-xs text-slate-400 mt-1">Upload image or paste link. Shows on receipts only</p>
      </div>

      {/* TIN NUMBER */}
      <div>
        <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
          TIN / Tax Number
        </label>
        <input
          type="text"
          name="tin_number"
          defaultValue={shop.tin_number || ''}
          placeholder="e.g. 1000123456"
          className="w-full text-sm p-2.5 border-slate-700 rounded-xl bg-slate-800 bg-opacity-80 outline-none focus:border-blue-500 focus:bg-slate-800 transition text-white placeholder:text-slate-400"
        />
        <p className="text-xs text-slate-400 mt-1">This appears on printed receipts only. Not public</p>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
          Shop Location
        </label>
        <input
          type="text"
          name="location"
          defaultValue={shop.location || ''}
          placeholder="e.g. Kisementi, Kampala"
          className="w-full text-sm p-2.5 border-slate-700 rounded-xl bg-slate-800 bg-opacity-80 outline-none focus:border-blue-500 focus:bg-slate-800 transition text-white placeholder:text-slate-400"
        />
        <p className="text-xs text-slate-400 mt-1">This shows at the top of your shop page</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
            Shop Latitude
          </label>
          <input
            type="number"
            step="any"
            name="shop_lat"
            defaultValue={shop.shop_lat?? ''}
            placeholder="0.347596"
            className="w-full text-sm p-2.5 border border-slate-700 rounded-xl bg-slate-800 bg-opacity-80 outline-none focus:border-blue-500 focus:bg-slate-800 transition text-white placeholder:text-slate-400"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
            Shop Longitude
          </label>
          <input
            type="number"
            step="any"
            name="shop_lng"
            defaultValue={shop.shop_lng?? ''}
            placeholder="32.582520"
            className="w-full text-sm p-2.5 border-slate-700 rounded-xl bg-slate-800 bg-opacity-80 outline-none focus:border-blue-500 focus:bg-slate-800 transition text-white placeholder:text-slate-400"
          />
        </div>
      </div>
      <p className="text-xs text-slate-400 -mt-2">
        Used to calculate delivery distance. Get from Google Maps &gt; Right click &gt; What's here?
      </p>

      {/* PRICE PER KM INPUT */}
      <div>
        <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
          Price Per KM (UGX)
        </label>
        <input
          type="number"
          name="price_per_km"
          defaultValue={price_per_km}
          placeholder="e.g. 1000"
          className="w-full text-sm p-2.5 border-slate-700 rounded-xl bg-slate-800 bg-opacity-80 outline-none focus:border-blue-500 focus:bg-slate-800 transition text-white placeholder:text-slate-400"
        />
        <p className="text-xs text-slate-400 mt-1">This is what customers pay per kilometer for delivery</p>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
          Contact Info
        </label>
        <input
          type="text"
          name="contact_info"
          defaultValue={shop.contact_info || ''}
          placeholder="e.g. WhatsApp: +256 700 000"
          className="w-full text-sm p-2.5 border border-slate-700 rounded-xl bg-slate-800 bg-opacity-80 outline-none focus:border-blue-500 focus:bg-slate-800 transition text-white placeholder:text-slate-400"
        />
        <p className="text-xs text-slate-400 mt-1">Phone/email customers can reach you on</p>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
            Payment Methods
          </label>
          <button
            type="button"
            onClick={addPaymentMethod}
            className="text-xs bg-slate-700 bg-opacity-80 hover:bg-slate-600 hover:bg-opacity-80 text-slate-200 px-3 py-1.5 rounded-lg font-bold"
          >
            + Add Method
          </button>
        </div>

        {paymentMethods.map((pm, idx) => (
          <div key={idx} className="flex gap-2 items-start">
            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={pm.name}
                onChange={(e) => updatePaymentMethod(idx, 'name', e.target.value)}
                placeholder="e.g. MTN Mobile Money"
                className="w-full text-sm p-2.5 border-slate-700 rounded-xl bg-slate-800 bg-opacity-80 outline-none focus:border-blue-500 focus:bg-slate-800 transition text-white placeholder:text-slate-400"
              />
              <input
                type="text"
                value={pm.details}
                onChange={(e) => updatePaymentMethod(idx, 'details', e.target.value)}
                placeholder="e.g. 0772 123456 - John Doe"
                className="w-full text-sm p-2.5 border-slate-700 rounded-xl bg-slate-800 bg-opacity-80 outline-none focus:border-blue-500 focus:bg-slate-800 transition text-white placeholder:text-slate-400"
              />
            </div>
            {paymentMethods.length > 1 && (
              <button
                type="button"
                onClick={() => removePaymentMethod(idx)}
                className="mt-1 text-rose-400 hover:text-rose-300 text-sm font-bold px-2"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <p className="text-xs text-slate-400">Customers will see these at checkout</p>
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-2.5 rounded-xl text-sm transition"
      >
        Save Settings
      </button>
    </form>
  )
}
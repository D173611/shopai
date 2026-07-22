'use client'
import { useState } from 'react'

type Product = {
  id: string
  name: string
  price: number
  stock_quantity: number
}

export default function DebtForm({ products, recordNewDebt }: { products: Product[], recordNewDebt: any }) {
  const [items, setItems] = useState([{ id: 0 }])
  const [nextId, setNextId] = useState(1)

  const addItem = () => {
    setItems([...items, { id: nextId }])
    setNextId(nextId + 1)
  }

  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id))
    }
  }

  return (
    <form action={recordNewDebt} className="space-y-3">
      <input name="customerName" type="text" required placeholder="Customer Full Name" className="w-full border-slate-700 p-3 bg-slate-900/80 rounded-xl text-xs outline-none focus:border-blue-500 text-white placeholder:text-slate-500" />
      <input name="customerPhone" type="text" required placeholder="WhatsApp 2567..." className="w-full border border-slate-700 p-3 bg-slate-900/80 rounded-xl text-xs outline-none focus:border-blue-500 text-white placeholder:text-slate-500" />

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs text-slate-300 font-bold">Items</label>
          <button type="button" onClick={addItem} className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded-lg">+ Add Item</button>
        </div>
        {items.map((item, index) => (
          <div key={item.id} className="space-y-2 p-3 bg-slate-900/60 rounded-xl border border-slate-700">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Item {index + 1}</span>
              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(item.id)} className="text-xs text-rose-400 hover:text-rose-300">Remove</button>
              )}
            </div>
            <select name={`items[${index}].productId`} className="w-full border border-slate-700 p-2 bg-slate-900/80 rounded-lg text-xs outline-none text-white">
              <option value="">Select Product from Stock</option>
              {products?.map((p) => (
                <option key={p.id} value={p.id}>{p.name} - UGX {Number(p.price).toLocaleString()} ({p.stock_quantity} left)</option>
              ))}
            </select>
            <input name={`items[${index}].productName`} type="text" required placeholder="Or Type Product Name" className="w-full border border-slate-700 p-2 bg-slate-900/80 rounded-lg text-xs outline-none text-white placeholder:text-slate-500" />
            <div className="grid grid-cols-2 gap-2">
              <input name={`items[${index}].quantity`} type="number" defaultValue="1" min="1" step="any" placeholder="Qty" className="w-full border border-slate-700 p-2 bg-slate-900/80 rounded-lg text-xs outline-none font-mono text-white" />
              <input name={`items[${index}].unitPrice`} type="number" required min="1" step="any" placeholder="Unit Price UGX" className="w-full border border-slate-700 p-2 bg-slate-900/80 rounded-lg text-xs outline-none font-mono text-white" />
            </div>
          </div>
        ))}
      </div>

      <select name="installmentType" className="w-full border border-slate-700 p-3 bg-slate-900/80 rounded-xl text-xs outline-none focus:border-blue-500 text-white">
        <option value="once">Pay Once - Full Amount</option>
        <option value="daily">Daily Installment</option>
        <option value="weekly">Weekly Installment</option>
        <option value="monthly">Monthly Installment</option>
        <option value="yearly">Yearly Installment</option>
      </select>
      <input name="installmentAmount" type="number" min="0" step="any" placeholder="Installment Amount UGX" className="w-full border border-slate-700 p-3 bg-slate-900/80 rounded-xl text-xs outline-none focus:border-blue-500 font-mono text-white placeholder:text-slate-500" />
      <input name="notes" type="text" placeholder="Notes" className="w-full border border-slate-700 p-3 bg-slate-900/80 rounded-xl text-xs outline-none focus:border-blue-500 text-white placeholder:text-slate-500" />
      <button className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold p-3 rounded-xl uppercase tracking-wider border border-slate-700 transition">Add To Ledger</button>
    </form>
  )
}
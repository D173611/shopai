'use client'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrencySync } from '@/app/lib/currencies' // <-- 1. USE SYNC VERSION

type DebtItem = {
  product_name: string
  quantity: number
  unit_price: number
}

type DebtReceipt = {
  id: string
  customer_name: string
  customer_phone: string
  total_debt_amount: number
  paid_amount: number
  status: string
  debt_items: DebtItem[]
  last_updated: string
  shop_name?: string
  shop_country?: string // <-- 2. ADD THIS: pass shop country from parent
}

export function downloadDebtReceipt(debt: DebtReceipt) {
  const doc = new jsPDF()
  const balance = Number(debt.total_debt_amount) - Number(debt.paid_amount)
  const country = debt.shop_country || 'Uganda' // <-- 3. FALLBACK
  
  // Header
  doc.setFontSize(18)
  doc.text(debt.shop_name || 'Shop Credit Receipt', 14, 20)
  doc.setFontSize(10)
  doc.text(`Date: ${new Date(debt.last_updated).toLocaleDateString()}`, 14, 28)
  doc.text(`Receipt ID: ${debt.id.slice(0, 8).toUpperCase()}`, 14, 34)

  // Customer Info
  doc.setFontSize(12)
  doc.text('Customer Details', 14, 46)
  doc.setFontSize(10)
  doc.text(`Name: ${debt.customer_name}`, 14, 54)
  doc.text(`Phone: ${debt.customer_phone}`, 14, 60)

  // Items Table - 4. USE formatCurrencySync
  const items = debt.debt_items.map(item => [
    item.product_name,
    item.quantity.toString(),
    formatCurrencySync(Number(item.unit_price), country),
    formatCurrencySync(item.quantity * item.unit_price, country)
  ])

  autoTable(doc, {
    startY: 70,
    head: [['Item', 'Qty', 'Unit Price', 'Total']],
    body: items,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59] }
  })

  // Totals - 5. USE formatCurrencySync
  const finalY = (doc as any).lastAutoTable.finalY + 10
  doc.setFontSize(11)
  doc.text(`Total Credit: ${formatCurrencySync(Number(debt.total_debt_amount), country)}`, 14, finalY)
  doc.text(`Amount Paid: ${formatCurrencySync(Number(debt.paid_amount), country)}`, 14, finalY + 7)
  doc.setFontSize(12)
  doc.text(`Balance Due: ${formatCurrencySync(balance, country)}`, 14, finalY + 15)
  doc.setFontSize(10)
  doc.text(`Status: ${debt.status.toUpperCase()}`, 14, finalY + 23)

  // Footer
  doc.setFontSize(8)
  doc.text('Thank you for your payment. Keep this receipt for your records.', 14, finalY + 35)

  doc.save(`Receipt-${debt.customer_name.replace(/\s+/g, '_')}-${Date.now()}.pdf`)
}
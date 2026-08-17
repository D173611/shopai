'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { createClient } from '@/app/utils/supabase/client'

type ReceiptProps = {
  shop: {
    name: string
    logo_url?: string | null
    tin_number?: string | null
    location?: string | null
  }
  order: {
    receipt_number: string
    created_at: string
    items: { name: string, qty: number, price: number, total: number }[]
    total: number
    delivery_fee: number
    type: 'pos' | 'delivery'
    customer_phone?: string
    cashier_name?: string
  }
}

export default function Receipt({ shop, order }: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const hasRun = useRef(false)

  const formatUGX = (n: number) => `UGX ${n.toLocaleString('en-UG')}`
  const date = new Date(order.created_at).toLocaleDateString('en-UG')
  const time = new Date(order.created_at).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })

  const formatPhone = (phone: string) => {
    if (phone.startsWith('0')) return '256' + phone.slice(1)
    if (phone.startsWith('+256')) return phone.slice(1)
    return phone
  }

  const uploadPDFToSupabase = useCallback(async (blob: Blob, filename: string) => {
    const supabase = createClient()
    const { data, error } = await supabase.storage
    .from('receipts')
    .upload(filename, blob, { upsert: true, contentType: 'application/pdf' })

    if(error) throw error
    
    // FIXED: was missing a } and wrong destructuring
    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(data.path)
    return urlData.publicUrl
  }, [])

  const downloadPDF = useCallback(async () => {
    if (!receiptRef.current) return ''

    const canvas = await html2canvas(receiptRef.current, {
      scale: 2,
      backgroundColor: '#fff',
      useCORS: true
    })
    const imgData = canvas.toDataURL('image/png')

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 200] })
    const pdfWidth = 80
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)

    pdf.save(`${order.receipt_number}.pdf`)

    const pdfBlob = pdf.output('blob')
    const publicUrl = await uploadPDFToSupabase(pdfBlob, `${order.receipt_number}.pdf`)
    return publicUrl
  }, [order.receipt_number, uploadPDFToSupabase])

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    const run = async () => {
      setIsProcessing(true)
      try {
        await new Promise(r => setTimeout(r, 1500))
        window.print()
        const pdfUrl = await downloadPDF()

        if(order.type === 'delivery' && order.customer_phone && pdfUrl) {
          const formattedPhone = formatPhone(order.customer_phone)
          await fetch('/api/send-whatsapp', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              phone: formattedPhone,
              pdfUrl,
              receiptNumber: order.receipt_number
            })
          })
        }
      } catch (err) {
        console.error('Receipt processing failed:', err)
        alert('Failed to process receipt. Please use manual buttons.')
      } finally {
        setIsProcessing(false)
      }
    }
    run()
  }, [order, downloadPDF]) // FIXED: added deps

  return (
    <div ref={receiptRef} className="max-w-[320px] mx-auto bg-white text-black p-4 font-mono text-[12px] leading-tight">
      <div className="text-center border-b border-dashed pb-2">
        {shop.logo_url && <img src={shop.logo_url} alt={shop.name} className="w-16 h-16 object-contain mx-auto mb-1" />}
        <h1 className="text-base font-bold uppercase">{shop.name}</h1>
        {shop.location && <p className="text-[11px]">{shop.location}</p>}
      </div>

      <div className="text-[11px] mt-2 space-y-0.5">
        <div className="flex justify-between"><span>Receipt:</span><span>{order.receipt_number}</span></div>
        <div className="flex justify-between"><span>Date:</span><span>{date} {time}</span></div>
        <div className="flex justify-between"><span>Type:</span><span className="uppercase font-bold">{order.type}</span></div>
      </div>

      <div className="border-t border-dashed mt-2 pt-2">
        {order.items.map((item, i) => (
          <div key={i} className="mb-1.5">
            <div className="truncate">{item.name}</div>
            <div className="flex justify-between text-[11px]">
              <span>{item.qty} x {formatUGX(item.price)}</span>
              <span>{formatUGX(item.total)}</span>
            </div>
          </div>
        ))}
      </div>

      {order.type === 'delivery' && order.delivery_fee > 0 && (
        <div className="flex justify-between text-[11px] mt-1">
          <span>Delivery Fee</span><span>{formatUGX(order.delivery_fee)}</span>
        </div>
      )}

      <div className="border-t border-dashed mt-2 pt-2 font-bold">
        <div className="flex justify-between text-sm">
          <span>TOTAL</span><span>{formatUGX(order.total)}</span>
        </div>
      </div>

      <div className="text-[11px] mt-3 border-t border-dashed pt-2 text-center space-y-0.5">
        {shop.tin_number && <p>TIN: {shop.tin_number}</p>}
        {order.cashier_name && <p>Cashier: {order.cashier_name}</p>}
        <p className="mt-1">Thank you for shopping with us!</p>
      </div>

      {isProcessing && (
        <div className="print:hidden mt-2 text-center text-xs text-blue-600">Processing receipt...</div>
      )}

      <div className="print:hidden mt-4 flex gap-2">
        <button onClick={() => window.print()} disabled={isProcessing} className="flex-1 bg-black text-white py-2 rounded-lg font-bold disabled:opacity-50">
          Print
        </button>
        <button onClick={downloadPDF} disabled={isProcessing} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold disabled:opacity-50">
          Download
        </button>
      </div>
    </div>
  )
}
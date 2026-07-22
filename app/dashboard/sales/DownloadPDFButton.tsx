'use client'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type Props = {
  orders: any[]
  branchMap: Map<string, string>
  filter: string
}

export default function DownloadPDFButton({ orders, branchMap, filter }: Props) {
  const handleDownload = () => {
    const doc = new jsPDF()
    
    doc.setFontSize(18)
    doc.text('Sales Ledger Report', 14, 20)
    doc.setFontSize(11)
    doc.text(`Filter: ${filter.toUpperCase()}`, 14, 28)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34)

    const getOrderTotal = (order: any) => Number(order.total || order.amount || order.gross_price || 0)
    const totalRevenue = orders.reduce((sum, o) => sum + getOrderTotal(o), 0)
    
    doc.setFontSize(12)
    doc.text(`Total Revenue: UGX ${totalRevenue.toLocaleString()}`, 14, 42)
    doc.text(`Total Orders: ${orders.length}`, 14, 48)

    const tableData = orders.map(order => {
      const isPOS = order.source === 'POS' || order.source === 'pos'
      const customer = isPOS? 'Shop Order' : `${order.customer_name || order.name || 'Unknown'}`
      return [
        new Date(order.created_at).toLocaleDateString(),
        customer,
        order.source || 'ONLINE',
        branchMap.get(order.branch_id) || 'Main Hub',
        `UGX ${getOrderTotal(order).toLocaleString()}`
      ]
    })

    autoTable(doc, {
      head: [['Date', 'Customer', 'Source', 'Branch', 'Amount']],
      body: tableData,
      startY: 55,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 23, 42] }
    })

    doc.save(`sales-ledger-${filter}-${Date.now()}.pdf`)
  }

  return (
    <button
      onClick={handleDownload}
      disabled={orders.length === 0}
      className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 active:scale-95 transition disabled:bg-slate-600"
    >
      📄 Download PDF
    </button>
  )
}
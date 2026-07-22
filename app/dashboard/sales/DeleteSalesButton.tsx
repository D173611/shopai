'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  shopId: string
  filter: string
  branch: string
  label: string
}

export default function DeleteSalesButton({ shopId, filter, branch, label }: Props) {
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    const confirmMsg = `Archive ${filter === 'all'? 'ALL TIME' : filter.toUpperCase()} sales${branch!== 'all'? ' for this branch' : ''}? They will be hidden but won't affect inventory/reports.`
    if (!confirm(confirmMsg)) return

    setDeleting(true)
    const res = await fetch('/api/sales/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopId, filter, branch })
    })

    setDeleting(false)
    if (res.ok) {
      alert('Sales archived successfully')
      router.refresh()
    } else {
      const data = await res.json()
      alert(`Failed: ${data.error || 'Unknown error'}`)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="bg-rose-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-rose-700 active:scale-95 transition disabled:bg-slate-600"
    >
      {deleting? 'Archiving...' : label}
    </button>
  )
}
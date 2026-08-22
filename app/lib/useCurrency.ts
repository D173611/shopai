'use client'
import { useMemo } from 'react'
import { formatCurrencySync } from './currencies'

export function useCurrency(amount: number, country: string) {
  const formatted = useMemo(() => {
    return formatCurrencySync(amount, country || 'Uganda')
  }, [amount, country])

  return formatted
}
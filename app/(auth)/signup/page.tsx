import { Suspense } from 'react'
import SignupForm from './signup-form'

export default async function Page({ 
  searchParams 
}: { 
  searchParams: Promise<{ error?: string; success?: string }> 
}) {
  return (
    <Suspense fallback={
      <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-slate-950">
        <div className="text-white text-center text-sm font-semibold">
          Loading ShopAI...
        </div>
      </div>
    }>
      <SignupForm searchParams={searchParams} />
    </Suspense>
  )
}
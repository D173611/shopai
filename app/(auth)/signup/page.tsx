import { Suspense } from 'react'
import SignupForm from './signup-form'

type SearchParams = {
  error?: string
  success?: string
}

export default async function Page({ 
  searchParams 
}: { 
  searchParams: Promise<SearchParams> 
}) {
  const params = await searchParams // <-- THIS IS THE FIX

  return (
    <Suspense fallback={
      <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-slate-950">
        <div className="text-white text-center text-sm font-semibold">
          Loading ShopAI...
        </div>
      </div>
    }>
      <SignupForm searchParams={params} /> {/* Pass the resolved object */}
    </Suspense>
  )
}
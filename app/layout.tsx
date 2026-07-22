import './globals.css'
import type { Metadata } from 'next'
import DynamicBg from './components/DynamicBg'

export const metadata: Metadata = {
  title: 'ShopAI POS & ERP',
  description: 'Manage branches, scan inventory, and automate WhatsApp sales.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <DynamicBg />
        <main className="min-h-screen relative z-10">
          {children}
        </main>
      </body>
    </html>
  )
}
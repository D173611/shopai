'use client'

import { useEffect, useState } from 'react'

const IMAGES = [
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=100&w=3840&auto=format&fit=crop', // Checkout
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=100&w=3840&auto=format&fit=crop', // Retail store
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=100&w=3840&auto=format&fit=crop', // Warehouse
  'https://images.unsplash.com/photo-1497366216548-37526070297c?q=100&w=3840&auto=format&fit=crop', // Office
  'https://images.unsplash.com/photo-1556740772-1a741367b93e?q=100&w=3840&auto=format&fit=crop', // Shopping
  'https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=100&w=3840&auto=format&fit=crop', // POS
  'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?q=100&w=3840&auto=format&fit=crop', // Store aisle
  'https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=100&w=3840&auto=format&fit=crop', // Inventory
  'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=100&w=3840&auto=format&fit=crop', // Retail tech
  'https://images.unsplash.com/photo-1556740714-a8395b3bf30f?q=100&w=3840&auto=format&fit=crop', // Products
  'https://images.unsplash.com/photo-1607082349566-187342175e2f?q=100&w=3840&auto=format&fit=crop', // Scanner
  'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?q=100&w=3840&auto=format&fit=crop', // Shelves
  'https://images.unsplash.com/photo-1607083206968-13611e3d76db?q=100&w=3840&auto=format&fit=crop', // Cashier
  'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?q=100&w=3840&auto=format&fit=crop', // Business
  'https://images.unsplash.com/photo-1556742111-a301076d9d18?q=100&w=3840&auto=format&fit=crop', // Shopping bags
  'https://images.unsplash.com/photo-1556740758-90de374c12ad?q=100&w=3840&auto=format&fit=crop', // Storefront
  'https://images.unsplash.com/photo-1556741533-6e6a62bd8b49?q=100&w=3840&auto=format&fit=crop', // Receipt
  'https://images.unsplash.com/photo-1556742526-795a8eac090e?q=100&w=3840&auto=format&fit=crop', // Market
  'https://images.unsplash.com/photo-1556742044-3c52d6e88c62?q=100&w=3840&auto=format&fit=crop', // Payment
  'https://images.unsplash.com/photo-1556742205-e10c9486e506?q=100&w=3840&auto=format&fit=crop' // Commerce
]

export default function RotatingWallpaper({ children }: { children: React.ReactNode }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Preload all images
    IMAGES.forEach(src => {
      const img = new Image()
      img.src = src
    })
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % IMAGES.length)
    }, 60000) // 60 seconds = 1 minute

    return () => clearInterval(interval)
  }, [isLoaded])

  return (
    <div 
      className="min-h-screen p-6 space-y-6 bg-cover bg-center bg-fixed bg-no-repeat transition-all duration-1000 ease-in-out"
      style={{
        backgroundImage: `url('${IMAGES[currentIndex]}')`,
        imageRendering: 'crisp-edges'
      }}
    >
      <div className="min-h-screen -m-6 p-6 space-y-6">
        {children}
      </div>
    </div>
  )
}
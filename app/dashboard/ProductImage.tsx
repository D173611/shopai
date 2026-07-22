'use client'
import { useState } from 'react'

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=300&auto=format&fit=crop"

type ProductImageProps = {
  src: string | null | undefined
  allImages?: string[] | null
  alt: string
  useAiEnhanced?: boolean | null
  hasAiImage?: boolean
}

export default function ProductImage({ src, allImages, alt, useAiEnhanced, hasAiImage }: ProductImageProps) {
  const [imgSrc, setImgSrc] = useState(src || PLACEHOLDER_IMAGE)
  const [isZoomed, setIsZoomed] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  // Use allImages if provided, otherwise fall back to single src
  const images = allImages && allImages.length > 0 ? allImages : src ? [src] : [PLACEHOLDER_IMAGE]

  const openZoom = (index = 0) => {
    setCurrentIndex(index)
    setIsZoomed(true)
  }

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <>
      {/* Updated w-16 h-16 to w-full h-full to fill parent container */}
      <div className="relative w-full h-full rounded-xl bg-slate-200 overflow-hidden shrink-0 border-2 border-white shadow-sm group cursor-zoom-in">
        <img
          src={imgSrc}
          alt={alt}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          onClick={() => openZoom(0)}
          onError={() => setImgSrc(PLACEHOLDER_IMAGE)}
        />
        {useAiEnhanced && hasAiImage && (
          <span className="absolute top-0.5 right-0.5 bg-blue-600 text-white text-[8px] px-1 py-0.5 rounded font-black uppercase tracking-wider shadow">
            AI ✨
          </span>
        )}
        {images.length > 1 && images[0] !== PLACEHOLDER_IMAGE && (
          <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[9px] px-1 rounded font-bold">
            {images.length}
          </span>
        )}
      </div>

      {isZoomed && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setIsZoomed(false)}
        >
          {/* Close button */}
          <button
            onClick={() => setIsZoomed(false)}
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold hover:bg-black/70 z-10"
          >
            ×
          </button>

          {/* Left arrow */}
          {images.length > 1 && (
            <button
              onClick={prevImage}
              className="absolute left-4 text-white bg-black/50 rounded-full w-12 h-12 flex items-center justify-center text-2xl font-bold hover:bg-black/70 z-10"
            >
              ‹
            </button>
          )}

          {/* Main image */}
          <img
            src={images[currentIndex]}
            alt={`${alt} ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
            onError={(e) => {
              (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE
            }}
          />

          {/* Right arrow */}
          {images.length > 1 && (
            <button
              onClick={nextImage}
              className="absolute right-4 text-white bg-black/50 rounded-full w-12 h-12 flex items-center justify-center text-2xl font-bold hover:bg-black/70 z-10"
            >
              ›
            </button>
          )}

          {/* Image counter */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-bold">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </>
  )
}
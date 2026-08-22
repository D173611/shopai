'use client'
import { useState, useEffect, useRef } from 'react' // VIDEO ADD: useEffect, useRef
import { createClient } from '../utils/supabase/client' // VIDEO ADD

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=300&auto=format&fit=crop"

type ProductImageProps = {
  src: string | null | undefined
  allImages?: string[] | null
  alt: string
  useAiEnhanced?: boolean | null
  hasAiImage?: boolean
  productId?: string // VIDEO ADD: to fetch videos
}

export default function ProductImage({ src, allImages, alt, useAiEnhanced, hasAiImage, productId }: ProductImageProps) { // VIDEO ADD: productId
  const [imgSrc, setImgSrc] = useState(src || PLACEHOLDER_IMAGE)
  const [isZoomed, setIsZoomed] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [videos, setVideos] = useState<string[]>([]) // VIDEO ADD
  const [isPlaying, setIsPlaying] = useState(false) // VIDEO ADD
  const videoRef = useRef<HTMLVideoElement>(null) // VIDEO ADD
  const supabase = createClient() // VIDEO ADD

  // Use allImages if provided, otherwise fall back to single src
  const images = allImages && allImages.length > 0? allImages : src? [src] : [PLACEHOLDER_IMAGE]

  // VIDEO ADD: Fetch videos for this product
  useEffect(() => {
    if (!productId) return
    const fetchVideos = async () => {
      const { data } = await supabase
      .from('product_videos')
      .select('video_url')
      .eq('product_id', productId)
      if (data && data.length > 0) {
        const urls = data.map(v => supabase.storage.from('product-videos').getPublicUrl(v.video_url).data.publicUrl)
        setVideos(urls)
      }
    }
    fetchVideos()
  }, [productId, supabase])

  const handleMouseEnter = () => { // VIDEO ADD
    if (videos.length > 0 && videoRef.current) {
      videoRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleMouseLeave = () => { // VIDEO ADD
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }

  const openZoom = (index = 0) => {
    setCurrentIndex(index)
    setIsZoomed(true)
    setIsPlaying(false) // VIDEO ADD: stop video when zoom opens
    videoRef.current?.pause() // VIDEO ADD
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
      <div
        className="relative w-full h-full rounded-xl bg-slate-200 overflow-hidden shrink-0 border-2 border-white shadow-sm group cursor-zoom-in"
        onMouseEnter={handleMouseEnter} // VIDEO ADD
        onMouseLeave={handleMouseLeave} // VIDEO ADD
        onClick={() => { // VIDEO ADD: tap to play on mobile
          if (videos.length > 0) {
            setIsPlaying(!isPlaying)
            isPlaying? videoRef.current?.pause() : videoRef.current?.play()
          } else {
            openZoom(0) // VIDEO ADD: if no video, open zoom like before
          }
        }}
      >
        {/* IMAGE */} {/* VIDEO ADD */}
        <img
          src={imgSrc}
          alt={alt}
          className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-300 ${isPlaying? 'opacity-0' : 'opacity-100'}`} // VIDEO ADD: fade out when video plays
          onClick={(e) => { e.stopPropagation(); if(videos.length === 0) openZoom(0) }} // VIDEO ADD
          onError={() => setImgSrc(PLACEHOLDER_IMAGE)}
        />

        {/* VIDEO */} {/* VIDEO ADD */}
        {videos.length > 0 && (
          <video
            ref={videoRef}
            src={videos[0]}
            muted
            loop
            playsInline
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${isPlaying? 'opacity-100' : 'opacity-0'}`}
          />
        )}

        {useAiEnhanced && hasAiImage && (
          <span className="absolute top-0.5 right-0.5 bg-blue-600 text-white text-[8px] px-1 py-0.5 rounded font-black uppercase tracking-wider shadow z-10"> {/* VIDEO ADD: z-10 */}
            AI ✨
          </span>
        )}

        {/* VIDEO ICON */} {/* VIDEO ADD */}
        {videos.length > 0 &&!isPlaying && (
          <span className="absolute bottom-0.5 left-0.5 bg-black/70 text-white rounded-full p-1 z-10">
            <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        )}

        {images.length > 1 && images[0]!== PLACEHOLDER_IMAGE && (
          <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[9px] px-1 rounded font-bold z-10"> {/* VIDEO ADD: z-10 */}
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
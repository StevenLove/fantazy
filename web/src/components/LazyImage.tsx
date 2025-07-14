'use client'

import { useState, useEffect, useRef } from 'react'

interface LazyImageProps {
  src: string
  alt: string
  className?: string
  placeholder?: string
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void
}

export default function LazyImage({ 
  src, 
  alt, 
  className = '', 
  placeholder,
  onError 
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { 
        threshold: 0.1, // Load when 10% visible
        rootMargin: '50px' // Start loading 50px before becoming visible
      }
    )
    
    if (imgRef.current) {
      observer.observe(imgRef.current)
    }
    
    return () => observer.disconnect()
  }, [])

  const handleLoad = () => {
    setIsLoaded(true)
  }

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true)
    if (onError) {
      onError(e)
    }
  }

  return (
    <div ref={imgRef} className={`relative ${className}`}>
      {!isInView ? (
        // Placeholder while not in view
        <div className="w-full h-full bg-gray-200 rounded-full animate-pulse flex items-center justify-center">
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        </div>
      ) : (
        <>
          {!isLoaded && !hasError && (
            // Loading state
            <div className="absolute inset-0 bg-gray-200 rounded-full animate-pulse flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
          )}
          
          {!hasError && (
            <img
              src={src}
              alt={alt}
              className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={handleLoad}
              onError={handleError}
            />
          )}
          
          {hasError && (
            // Error state - show default avatar
            <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </>
      )}
    </div>
  )
}
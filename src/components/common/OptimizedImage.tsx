import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '../../lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  placeholder?: string;
  fallback?: string;
  onLoad?: () => void;
  onError?: () => void;
  priority?: boolean; // For above-the-fold images
}

export function OptimizedImage({
  src,
  alt,
  className,
  width,
  height,
  loading = 'lazy',
  placeholder = 'data:image/svg+xml,%3Csvg width="400" height="300" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="100%25" height="100%25" fill="%23f3f4f6"/%3E%3C/svg%3E',
  fallback,
  onLoad,
  onError,
  priority = false,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(placeholder);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Generate WebP version if supported
  const getOptimizedSrc = useCallback((originalSrc: string) => {
    // Check if WebP is supported
    const canvas = document.createElement('canvas');
    const webpSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    
    if (webpSupported && !originalSrc.endsWith('.webp')) {
      // Try to serve WebP version
      return originalSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    }
    
    return originalSrc;
  }, []);

  // Load image
  const loadImage = useCallback(() => {
    if (!src || hasError) return;

    const optimizedSrc = getOptimizedSrc(src);
    const img = new Image();
    
    img.onload = () => {
      setCurrentSrc(optimizedSrc);
      setIsLoaded(true);
      onLoad?.();
    };
    
    img.onerror = () => {
      // Try original src if WebP failed
      if (optimizedSrc !== src) {
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          setCurrentSrc(src);
          setIsLoaded(true);
          onLoad?.();
        };
        fallbackImg.onerror = () => {
          if (fallback) {
            setCurrentSrc(fallback);
            setIsLoaded(true);
          } else {
            setHasError(true);
          }
          onError?.();
        };
        fallbackImg.src = src;
      } else {
        if (fallback) {
          setCurrentSrc(fallback);
          setIsLoaded(true);
        } else {
          setHasError(true);
        }
        onError?.();
      }
    };
    
    img.src = optimizedSrc;
  }, [src, getOptimizedSrc, fallback, onLoad, onError, hasError]);

  // Setup intersection observer for lazy loading
  useEffect(() => {
    if (priority || loading === 'eager') {
      loadImage();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadImage();
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before image comes into view
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
      observerRef.current = observer;
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [priority, loading, loadImage]);

  // Generate responsive srcset
  const getSrcSet = useCallback((originalSrc: string) => {
    if (!width || !height) return undefined;
    
    const sizes = [1, 1.5, 2];
    const srcSet = sizes
      .map((scale) => {
        const scaledWidth = Math.round(width * scale);
        const scaledHeight = Math.round(height * scale);
        return `${originalSrc}?w=${scaledWidth}&h=${scaledHeight} ${scale}x`;
      })
      .join(', ');
    
    return srcSet;
  }, [width, height]);

  if (hasError && !fallback) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center bg-gray-100 text-gray-400',
          className
        )}
        style={{ width, height }}
      >
        <span className="text-sm">Failed to load image</span>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <img
        ref={imgRef}
        src={currentSrc}
        srcSet={getSrcSet(src)}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : loading}
        decoding="async"
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        style={{ 
          width: width || '100%', 
          height: height || 'auto',
        }}
      />
      
      {/* Loading placeholder */}
      {!isLoaded && !hasError && (
        <div 
          className="absolute inset-0 bg-gray-100 animate-pulse"
          style={{ width, height }}
        />
      )}
      
      {/* Error fallback */}
      {hasError && fallback && (
        <img
          src={fallback}
          alt={alt}
          width={width}
          height={height}
          className={cn('opacity-50', className)}
          style={{ 
            width: width || '100%', 
            height: height || 'auto',
          }}
        />
      )}
    </div>
  );
}

// Picture component for multiple formats
export function Picture({
  src,
  alt,
  className,
  width,
  height,
  loading = 'lazy',
  onLoad,
  onError,
}: Omit<OptimizedImageProps, 'priority' | 'placeholder' | 'fallback'>) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState('');

  useEffect(() => {
    // Determine best format based on browser support
    const canvas = document.createElement('canvas');
    const webpSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    const avifSupported = 'AVIF' in window;

    let bestSrc = src;
    if (avifSupported && !src.endsWith('.avif')) {
      bestSrc = src.replace(/\.(jpg|jpeg|png|webp)$/i, '.avif');
    } else if (webpSupported && !src.endsWith('.webp')) {
      bestSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    }

    setCurrentSrc(bestSrc);
  }, [src]);

  return (
    <picture>
      <source
        srcSet={src.replace(/\.(jpg|jpeg|png)$/i, '.avif')}
        type="image/avif"
      />
      <source
        srcSet={src.replace(/\.(jpg|jpeg|png)$/i, '.webp')}
        type="image/webp"
      />
      <OptimizedImage
        src={currentSrc}
        alt={alt}
        className={className}
        width={width}
        height={height}
        loading={loading}
        onLoad={() => {
          setIsLoaded(true);
          onLoad?.();
        }}
        onError={onError}
      />
    </picture>
  );
}

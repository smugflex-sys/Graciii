/**
 * Image optimization utility
 * Provides functions to optimize and serve images in modern formats
 */

import React from 'react';

// Supported image formats with MIME types
const SUPPORTED_FORMATS = {
  webp: 'image/webp',
  avif: 'image/avif',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
} as const;

type ImageFormat = keyof typeof SUPPORTED_FORMATS;

interface ImageOptimizerOptions {
  /**
   * Target width in pixels
   * If not provided, maintains original aspect ratio with height
   */
  width?: number;
  
  /**
   * Target height in pixels
   * If not provided, maintains original aspect ratio with width
   */
  height?: number;
  
  /**
   * Quality (0-100) for lossy formats
   * @default 80
   */
  quality?: number;
  
  /**
   * Preferred output formats in order of preference
   * @default ['webp', 'avif', 'original']
   */
  formats?: (ImageFormat | 'original')[];
  
  /**
   * Whether to use device pixel ratio for responsive images
   * @default true
   */
  devicePixelRatio?: boolean;
  
  /**
   * Whether to use lazy loading for the image
   * @default true
   */
  lazy?: boolean;
  
  /**
   * CSS class names for the image element
   */
  className?: string;
  
  /**
   * Alt text for the image (required for accessibility)
   */
  alt: string;
}

/**
 * Generates optimized image sources for different formats
 */
const generateImageSources = (
  src: string,
  options: Omit<ImageOptimizerOptions, 'alt' | 'className' | 'lazy'>
) => {
  const {
    width,
    height,
    quality = 80,
    formats = ['webp', 'avif', 'original'],
    devicePixelRatio = true,
  } = options;

  const url = new URL(src, window.location.origin);
  const params = new URLSearchParams();

  if (width) params.set('w', width.toString());
  if (height) params.set('h', height.toString());
  if (quality !== 80) params.set('q', quality.toString());
  if (devicePixelRatio && window.devicePixelRatio > 1) {
    params.set('dpr', Math.min(window.devicePixelRatio, 2).toString());
  }

  return formats.map(format => {
    if (format === 'original') {
      const ext = src.split('.').pop()?.toLowerCase() as ImageFormat | undefined;
      if (!ext || !SUPPORTED_FORMATS[ext]) return null;
      
      const formatUrl = new URL(url);
      formatUrl.search = params.toString();
      
      return {
        src: formatUrl.toString(),
        type: SUPPORTED_FORMATS[ext],
      };
    }
    
    if (!SUPPORTED_FORMATS[format as ImageFormat]) return null;
    
    const formatUrl = new URL(url);
    formatUrl.search = params.toString();
    formatUrl.pathname = `${formatUrl.pathname}.${format}`;
    
    return {
      src: formatUrl.toString(),
      type: SUPPORTED_FORMATS[format as ImageFormat],
    };
  }).filter(Boolean) as Array<{ src: string; type: string }>;
};

/**
 * OptimizedImage component
 * Renders an optimized picture element with multiple sources
 */
export const OptimizedImage: React.FC<ImageOptimizerOptions & { src: string }> = ({
  src,
  width,
  height,
  quality,
  formats = ['webp', 'avif', 'original'],
  devicePixelRatio = true,
  lazy = true,
  className,
  alt,
}) => {
  const sources = generateImageSources(src, {
    width,
    height,
    quality,
    formats,
    devicePixelRatio,
  });

  // Original image source (last in the array)
  const originalSource = sources[sources.length - 1];
  
  return (
    <picture className={className}>
      {sources.slice(0, -1).map((source, index) => (
        <source
          key={index}
          srcSet={source.src}
          type={source.type}
        />
      ))}
      <img
        src={originalSource.src}
        alt={alt}
        width={width}
        height={height}
        loading={lazy ? 'lazy' : 'eager'}
        decoding="async"
        style={{
          width: width ? `${width}px` : '100%',
          height: height ? `${height}px` : 'auto',
          objectFit: 'cover',
        }}
      />
    </picture>
  );
};

/**
 * Simple image optimization URL generator
 * For use with external image optimization services like Cloudinary or Imgix
 */
export const getOptimizedImageUrl = (
  src: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: ImageFormat;
    [key: string]: any;
  } = {}
): string => {
  const url = new URL(src);
  const params = new URLSearchParams();
  
  // Add optimization parameters
  if (options.width) params.set('w', options.width.toString());
  if (options.height) params.set('h', options.height.toString());
  if (options.quality) params.set('q', options.quality.toString());
  if (options.format) params.set('fm', options.format);
  
  // Add any additional parameters
  Object.entries(options)
    .filter(([key]) => !['width', 'height', 'quality', 'format'].includes(key))
    .forEach(([key, value]) => {
      params.set(key, String(value));
    });
  
  // If using Cloudinary or similar, you might need to adjust the URL structure
  if (url.hostname.includes('cloudinary')) {
    // Example: https://res.cloudinary.com/demo/image/upload/w_500,h_300,q_80/sample.jpg
    const pathParts = url.pathname.split('/');
    const transformations: string[] = [];
    
    if (options.width) transformations.push(`w_${options.width}`);
    if (options.height) transformations.push(`h_${options.height}`);
    if (options.quality) transformations.push(`q_${options.quality}`);
    if (options.format) transformations.push(`f_${options.format}`);
    
    if (transformations.length > 0) {
      pathParts.splice(5, 0, transformations.join(','));
    }
    
    url.pathname = pathParts.join('/');
    return url.toString();
  }
  
  // For simple URL-based optimizations
  url.search = params.toString();
  return url.toString();
};

/**
 * Preload critical images
 */
export const preloadImage = (src: string, as: 'image' | 'image/webp' | 'image/avif' = 'image') => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = as;
  link.href = src;
  
  // Add 'imageSrcset' and 'imageSizes' if needed
  // link.imageSrcset = '...';
  // link.imageSizes = '...';
  
  document.head.appendChild(link);
  
  // Clean up after the image is loaded or after a timeout
  const cleanup = () => {
    if (document.head.contains(link)) {
      document.head.removeChild(link);
    }
  };
  
  // Clean up after the image is loaded
  const img = new Image();
  img.src = src;
  img.onload = cleanup;
  img.onerror = cleanup;
  
  // Clean up after 10 seconds if the image fails to load
  setTimeout(cleanup, 10000);
  
  return cleanup;
};

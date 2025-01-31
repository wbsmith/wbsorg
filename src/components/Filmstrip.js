// src/components/Filmstrip.js
import React, { useCallback, useRef, useState, useEffect } from 'react';

const Filmstrip = ({ images, selectedImage, onImageSelect, isLoading }) => {
  const scrollRef = useRef(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const itemWidth = 120; // Width of each thumbnail including margin

  // Optimized scroll handler with debounce built-in
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;

    const element = scrollRef.current;
    const scrollLeft = element.scrollLeft;
    const viewportWidth = element.clientWidth;
    
    // Calculate which items should be visible
    const start = Math.max(0, Math.floor(scrollLeft / itemWidth) - 5); // 5 items buffer
    const visibleItems = Math.ceil(viewportWidth / itemWidth);
    const end = Math.min(images.length, start + visibleItems + 10); // 10 items buffer
    
    setVisibleRange({ start, end });
  }, [images.length, itemWidth]);

  // Throttled scroll handler
  useEffect(() => {
    let timeoutId = null;
    const scrollElement = scrollRef.current;

    const throttledScroll = () => {
      if (timeoutId === null) {
        timeoutId = setTimeout(() => {
          handleScroll();
          timeoutId = null;
        }, 50);
      }
    };

    if (scrollElement) {
      scrollElement.addEventListener('scroll', throttledScroll);
      // Initial calculation
      handleScroll();
    }

    return () => {
      if (scrollElement) {
        scrollElement.removeEventListener('scroll', throttledScroll);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [handleScroll]);

  const handleScrollButton = useCallback((direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -itemWidth * 3 : itemWidth * 3;
      scrollRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
    }
  }, [itemWidth]);

  // Only render the visible images plus buffer
  const visibleImages = images.slice(visibleRange.start, visibleRange.end);

  return (
    <div className="filmstrip-container">
      <button
        className="scroll-button left"
        onClick={() => handleScrollButton('left')}
        aria-label="Scroll left"
        disabled={isLoading}
      >
        ‹
      </button>
      
      <div 
        className="filmstrip-scroll" 
        ref={scrollRef}
      >
        <div 
          className="filmstrip"
          style={{ 
            width: `${images.length * itemWidth}px`,
            position: 'relative',
            height: '130px'
          }}
        >
          {isLoading ? (
            <div className="loading-indicator">Loading images...</div>
          ) : (
            visibleImages.map((image, index) => (
              <div
                key={image.id}
                className={`thumbnail ${selectedImage?.id === image.id ? 'selected' : ''}`}
                onClick={() => onImageSelect(image)}
                style={{
                  position: 'absolute',
                  left: `${(visibleRange.start + index) * itemWidth}px`,
                  width: `${itemWidth - 10}px`, // 10px for gap
                  transform: selectedImage?.id === image.id ? 'scale(1.05)' : 'scale(1)'
                }}
              >
                <img 
                  src={image.thumbnail || image.url} 
                  alt={image.title}
                  loading="lazy"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    // Fallback to main image if thumbnail fails
                    e.target.src = image.url;
                  }}
                />
                <span className="image-title">{image.title}</span>
              </div>
            ))
          )}
        </div>
      </div>
      
      <button
        className="scroll-button right"
        onClick={() => handleScrollButton('right')}
        aria-label="Scroll right"
        disabled={isLoading}
      >
        ›
      </button>
    </div>
  );
};

// Prevent unnecessary re-renders
export default React.memo(Filmstrip, (prevProps, nextProps) => {
  return (
    prevProps.selectedImage?.id === nextProps.selectedImage?.id &&
    prevProps.images.length === nextProps.images.length &&
    prevProps.isLoading === nextProps.isLoading
  );
});
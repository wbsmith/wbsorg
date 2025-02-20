import React, { forwardRef, useRef, useImperativeHandle, useEffect, useCallback } from 'react';
import { debounce } from 'lodash'; // Install lodash: npm install lodash

const Filmstrip = forwardRef(({ images, selectedImage, onImageSelect, isLoading }, outerRef) => {
  const scrollRef = useRef(null);
  const keyPressRef = useRef(null); // Consider removing if debouncing works well
  const selectedImageRef = useRef(selectedImage); // Keep track of selected image

  // Update selectedImageRef whenever selectedImage changes
  useEffect(() => {
    selectedImageRef.current = selectedImage;
  }, [selectedImage]);


  // Share scrollRef with parent through forwardRef
  useImperativeHandle(outerRef, () => ({
    getScrollPosition: () => scrollRef.current?.scrollLeft || 0,
    setScrollPosition: (position) => {
      if (scrollRef.current) {
        scrollRef.current.scrollLeft = position;
      }
    },
  }));

  // Debounced scroll handler.  This is MUCH better than the keyPressRef approach.
  const handleScroll = useCallback(
    debounce((direction) => {
      if (scrollRef.current) {
        const scrollAmount = direction === 'left' ? -200 : 200;
        scrollRef.current.scrollLeft += scrollAmount;
      }
    }, 100), // 100ms debounce
    []
  );

  // Optimized keyboard navigation with useCallback
  const handleKeyDown = useCallback(
    (e) => {
      if (!images.length) return;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault(); // Prevent page scrolling
      }
        //Using ref to get selectedImage
      const currentIndex = images.findIndex((img) => img.id === selectedImageRef.current?.id);
      let newIndex = currentIndex;

      switch (e.key) {
        case 'ArrowLeft':
          newIndex = Math.max(0, currentIndex - 1);
          break;
        case 'ArrowRight':
          newIndex = Math.min(images.length - 1, currentIndex + 1);
          break;
        default:
          return;
      }

      if (newIndex !== currentIndex) {
        onImageSelect(images[newIndex]);

        // Efficiently scroll to the selected thumbnail
        const thumbnailElement = scrollRef.current?.querySelector(`[data-image-id="${images[newIndex].id}"]`);
        if (thumbnailElement && scrollRef.current) {
            const container = scrollRef.current;
            const containerWidth = container.clientWidth;
            const elementOffset = thumbnailElement.offsetLeft;
            const elementWidth = thumbnailElement.offsetWidth;

          // Center the selected thumbnail
          const scrollPosition = elementOffset - (containerWidth - elementWidth) / 2;

          container.scrollTo({
            left: scrollPosition,
            behavior: 'smooth',
          });
        }
      }
    },
    [images, onImageSelect]
  ); // Removed selectedImage from dependency array

    //Combined keydown and keyup into one debounced function.
    const debouncedKeyDown = useCallback(debounce(handleKeyDown, 150), [handleKeyDown]);

    useEffect(() => {
        const keyDownHandler = (e) => {
            debouncedKeyDown(e);
        };

        window.addEventListener('keydown', keyDownHandler);

        return () => {
            window.removeEventListener('keydown', keyDownHandler);
            debouncedKeyDown.cancel(); // Cancel any pending debounced calls
        };
    }, [debouncedKeyDown]); // Use debouncedKeyDown in the effect


  // Lazy-load images
  const imageLoaded = {}; // Keep track of loaded images

  return (
    <div className="filmstrip-container">
      <button
        className="scroll-button left"
        onClick={() => handleScroll('left')}
        aria-label="Scroll left"
      >
        ‹
      </button>

      <div className="filmstrip-scroll" ref={scrollRef}>
          <div className="filmstrip">
            {images.map((image) => {
                const isSelected = selectedImage?.id === image.id;
                return (
                    <div
                        key={image.id}
                        data-image-id={image.id}
                        className={`thumbnail ${isSelected ? 'selected' : ''}`}
                        onClick={() => onImageSelect(image)}
                    >
                        {/* Conditional rendering with lazy loading */}
                        <img
                            src={isLoading || !imageLoaded[image.id] ? "placeholder.png" : image.thumbnail}  // Use a placeholder
                            alt={image.title}
                            crossOrigin="anonymous"
                            loading="lazy"
                            onLoad={() => { imageLoaded[image.id] = true; }} // Mark as loaded
                            style={{
                                opacity: isLoading || !imageLoaded[image.id] ? 0.5 : 1, //Dim if loading or placeholder
                                transition: 'opacity 0.3s ease' // Smooth transition
                            }}
                        />
                        <span className="image-title">{image.id}</span>
                    </div>
                );
              })}
          </div>
      </div>

      <button
        className="scroll-button right"
        onClick={() => handleScroll('right')}
        aria-label="Scroll right"
      >
        ›
      </button>
    </div>
  );
});

export default Filmstrip;
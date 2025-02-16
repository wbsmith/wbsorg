import React from 'react';

const Filmstrip = ({ images, selectedImage, onImageSelect }) => {
  const scrollRef = React.useRef(null);

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      scrollRef.current.scrollLeft += scrollAmount;
    }
  };

  // Ensure thumbnail is visible in viewport
  const ensureVisible = (element) => {
    if (!element || !scrollRef.current) return;

    const container = scrollRef.current;
    const containerLeft = container.scrollLeft;
    const containerRight = containerLeft + container.clientWidth;

    const elementLeft = element.offsetLeft;
    const elementRight = elementLeft + element.offsetWidth;

    // If element is to the left of the visible area
    if (elementLeft < containerLeft) {
      container.scrollTo({
        left: elementLeft - 20, // Add some padding
        behavior: 'smooth'
      });
    }
    // If element is to the right of the visible area
    else if (elementRight > containerRight) {
      container.scrollTo({
        left: elementRight - container.clientWidth + 20, // Add some padding
        behavior: 'smooth'
      });
    }
  };

  // Handle keyboard navigation
  React.useEffect(() => {
    const handleKeyPress = (e) => {
      if (!images.length) return;

      const currentIndex = images.findIndex(img => img.id === selectedImage?.id);
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
        
        // Use requestAnimationFrame to ensure the DOM has updated
        requestAnimationFrame(() => {
          const thumbnailElement = scrollRef.current?.querySelector(`[data-image-id="${images[newIndex].id}"]`);
          ensureVisible(thumbnailElement);
        });
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [images, selectedImage, onImageSelect]);

  // Keep selected image visible when it changes
  React.useEffect(() => {
    if (selectedImage) {
      const thumbnailElement = scrollRef.current?.querySelector(`[data-image-id="${selectedImage.id}"]`);
      ensureVisible(thumbnailElement);
    }
  }, [selectedImage]);

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
          {images.map((image) => (
            <div
              key={image.id}
              data-image-id={image.id}
              className={`thumbnail ${selectedImage?.id === image.id ? 'selected' : ''}`}
              onClick={() => onImageSelect(image)}
            >
              <img 
                src={image.thumbnail} 
                alt={image.title}
                crossOrigin="anonymous"
              />
              <span className="image-title">{image.id}</span>
            </div>
          ))}
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
};

export default Filmstrip;
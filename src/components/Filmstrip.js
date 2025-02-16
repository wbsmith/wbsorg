import React from 'react';

const Filmstrip = ({ images, selectedImage, onImageSelect }) => {
  const scrollRef = React.useRef(null);

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      scrollRef.current.scrollLeft += scrollAmount;
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
        
        // Scroll the thumbnail into view if needed
        const thumbnailElement = scrollRef.current?.querySelector(`[data-image-id="${images[newIndex].id}"]`);
        if (thumbnailElement) {
          const scrollContainer = scrollRef.current;
          const elementLeft = thumbnailElement.offsetLeft;
          const elementWidth = thumbnailElement.offsetWidth;
          const containerWidth = scrollContainer.offsetWidth;
          const containerScroll = scrollContainer.scrollLeft;

          // Check if the element is not fully visible
          if (elementLeft < containerScroll || 
              elementLeft + elementWidth > containerScroll + containerWidth) {
            // Calculate position to center the element
            const scrollPosition = elementLeft - (containerWidth - elementWidth) / 2;
            scrollContainer.scrollTo({
              left: scrollPosition,
              behavior: 'smooth'
            });
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [images, selectedImage, onImageSelect]);

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
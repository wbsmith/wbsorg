import React from 'react';

const Filmstrip = ({ images, selectedImage, onImageSelect }) => {
  const scrollRef = React.useRef(null);
  const keyPressRef = React.useRef(null);

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      scrollRef.current.scrollLeft += scrollAmount;
    }
  };

  // Handle keyboard navigation with debouncing
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent default scrolling behavior
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
      }

      if (!images.length || keyPressRef.current === e.key) return;

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
        keyPressRef.current = e.key;
        onImageSelect(images[newIndex]);
        
        const thumbnailElement = scrollRef.current?.querySelector(`[data-image-id="${images[newIndex].id}"]`);
        if (thumbnailElement && scrollRef.current) {
          const container = scrollRef.current;
          const containerWidth = container.clientWidth;
          const elementOffset = thumbnailElement.offsetLeft;
          const elementWidth = thumbnailElement.offsetWidth;
          
          // Calculate the target scroll position
          let scrollPosition;
          if (e.key === 'ArrowRight') {
            scrollPosition = elementOffset - (containerWidth - elementWidth) / 2;
          } else {
            scrollPosition = elementOffset - containerWidth / 3;
          }
          
          container.scrollTo({
            left: scrollPosition,
            behavior: 'smooth'
          });
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === keyPressRef.current) {
        keyPressRef.current = null;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
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
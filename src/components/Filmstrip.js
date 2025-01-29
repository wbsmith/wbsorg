import React from 'react';

const Filmstrip = ({ images, selectedImage, onImageSelect }) => {
  const scrollRef = React.useRef(null);

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      scrollRef.current.scrollLeft += scrollAmount;
    }
  };

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
              className={`thumbnail ${selectedImage === image.id ? 'selected' : ''}`}
              onClick={() => onImageSelect(image.id)}
            >
              <img src={image.thumbnail} alt={image.title} />
              <span className="image-title">{image.title}</span>
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
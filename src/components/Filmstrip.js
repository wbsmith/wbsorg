import React, { forwardRef, useRef, useImperativeHandle, useEffect, useCallback, useState } from 'react';
import { debounce } from 'lodash';

const Filmstrip = forwardRef(({ images, selectedImage, onImageSelect, isLoading }, outerRef) => {
    const scrollRef = useRef(null);
    const [loadingThumbnails, setLoadingThumbnails] = useState({});
    const [thumbnailErrors, setThumbnailErrors] = useState({});
    
    // Share scrollRef with parent through forwardRef
    useImperativeHandle(outerRef, () => ({
        getScrollPosition: () => scrollRef.current?.scrollLeft || 0,
        setScrollPosition: (position) => {
            if (scrollRef.current) {
                scrollRef.current.scrollLeft = position;
            }
        }
    }));

    // Button scroll handler - simplified
    const handleButtonScroll = useCallback((direction) => {
        if (!scrollRef.current) return;
        
        const scrollAmount = direction === 'left' ? -300 : 300;
        scrollRef.current.scrollLeft += scrollAmount;
    }, []);

    const handleThumbnailError = useCallback((imageId) => {
        console.error(`Thumbnail failed to load for image ${imageId}`);
        setThumbnailErrors(prev => ({ ...prev, [imageId]: true }));
    }, []);

    const handleThumbnailLoad = useCallback((imageId) => {
        setLoadingThumbnails(prev => {
            const newState = { ...prev };
            delete newState[imageId];
            return newState;
        });
        
        setThumbnailErrors(prev => {
            const newState = { ...prev };
            delete newState[imageId];
            return newState;
        });
    }, []);

    // Simplified keyboard handler with no debounce
    const handleKeyDown = useCallback((e) => {
        if (!images.length) return;
        
        // Only handle arrow keys
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        
        // Prevent default scrolling
        e.preventDefault();
        
        // Find current index
        const currentIndex = images.findIndex(img => img.id === selectedImage?.id);
        if (currentIndex === -1) return;
        
        // Determine new index
        let newIndex = currentIndex;
        if (e.key === 'ArrowLeft') {
            newIndex = Math.max(0, currentIndex - 1);
        } else if (e.key === 'ArrowRight') {
            newIndex = Math.min(images.length - 1, currentIndex + 1);
        }
        
        // Only update if changed
        if (newIndex !== currentIndex) {
            // Actually select the new image
            onImageSelect(images[newIndex]);
            
            // Make the selected thumbnail visible after a short delay
            // to let the selection update first
            setTimeout(() => {
                const thumbnailElement = scrollRef.current?.querySelector(`[data-image-id="${images[newIndex].id}"]`);
                if (thumbnailElement && scrollRef.current) {
                    // Calculate if the element is visible
                    const container = scrollRef.current;
                    const containerLeft = container.scrollLeft;
                    const containerRight = containerLeft + container.clientWidth;
                    const elementLeft = thumbnailElement.offsetLeft;
                    const elementRight = elementLeft + thumbnailElement.offsetWidth;
                    
                    // Only scroll if not fully visible
                    if (elementLeft < containerLeft || elementRight > containerRight) {
                        // Center the element
                        const newScrollPosition = elementLeft - (container.clientWidth - thumbnailElement.offsetWidth) / 2;
                        container.scrollLeft = newScrollPosition;
                    }
                }
            }, 50);
        }
    }, [images, selectedImage, onImageSelect]);

    // Set up keyboard handler
    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);

    // Reset error state for any images when they change
    useEffect(() => {
        if (images.length > 0) {
            // Reset errors when images are updated
            const currentIds = images.map(img => img.id);
            setThumbnailErrors(prev => {
                const newErrors = {};
                Object.keys(prev).forEach(id => {
                    if (currentIds.includes(id)) {
                        newErrors[id] = prev[id];
                    }
                });
                return newErrors;
            });
        }
    }, [images]);

    return (
        <div className="filmstrip-container">
            <button
                className="scroll-button left"
                onClick={() => handleButtonScroll('left')}
                aria-label="Scroll left"
            >
                ‹
            </button>

            <div className="filmstrip-scroll" ref={scrollRef} style={{ backgroundColor: 'black' }}>
                <div className="filmstrip">
                    {isLoading ? (
                        <div className="loading-message">Loading images...</div>
                    ) : images.length === 0 ? (
                        <div className="no-images-message">No images found</div>
                    ) : (
                        images.map((image) => (
                            <div
                                key={image.id}
                                data-image-id={image.id}
                                className={`thumbnail ${selectedImage?.id === image.id ? 'selected' : ''}`}
                                onClick={() => onImageSelect(image)}
                                style={{ backgroundColor: 'black', width: '150px', height: '100px' }}
                            >
                                {thumbnailErrors[image.id] ? (
                                    <div className="thumbnail-error" style={{ color: 'red', fontSize: '12px', textAlign: 'center', padding: '30px 5px' }}>
                                        Error loading thumbnail
                                    </div>
                                ) : (
                                    <img
                                        src={image.thumbnail}
                                        alt={image.title}
                                        crossOrigin="anonymous"
                                        loading="lazy"
                                        onLoad={() => handleThumbnailLoad(image.id)}
                                        onError={() => handleThumbnailError(image.id)}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            display: 'block',
                                            opacity: loadingThumbnails[image.id] ? 0.5 : 1,
                                        }}
                                    />
                                )}
                                <span className="image-title" style={{ color: 'blue' }}>{image.id}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <button
                className="scroll-button right"
                onClick={() => handleButtonScroll('right')}
                aria-label="Scroll right"
            >
                ›
            </button>
        </div>
    );
});

export default Filmstrip;
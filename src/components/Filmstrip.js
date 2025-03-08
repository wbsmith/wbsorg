import React, { forwardRef, useRef, useImperativeHandle, useEffect, useCallback, useState } from 'react';
import { debounce } from 'lodash'; // Make sure lodash is installed

const Filmstrip = forwardRef(({ images, selectedImage, onImageSelect, isLoading }, outerRef) => {
    const scrollRef = useRef(null);
    const selectedImageRef = useRef(selectedImage); // Track selected image
    const [loadingThumbnails, setLoadingThumbnails] = useState({});
    const [thumbnailErrors, setThumbnailErrors] = useState({});

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
        }
    }));

    // Debounced scroll handler
    const handleScroll = useCallback(
        debounce((direction) => {
            if (scrollRef.current) {
                const scrollAmount = direction === 'left' ? -200 : 200;
                scrollRef.current.scrollLeft += scrollAmount;
            }
        }, 100), // 100ms debounce
        []
    );

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

    const handleKeyDown = useCallback(
        (e) => {
            if (!images.length) return;

            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault(); // Prevent page scrolling
            }

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
    ); // Removed selectedImage

    // Combined keydown and keyup into one debounced function.
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
                onClick={() => handleScroll('left')}
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
                onClick={() => handleScroll('right')}
                aria-label="Scroll right"
            >
                ›
            </button>
        </div>
    );
});

export default Filmstrip;
import React, { forwardRef, useRef, useImperativeHandle, useEffect, useCallback, useState } from 'react';
import { throttle } from 'lodash'; // Using throttle instead of debounce for smoother interaction

const Filmstrip = forwardRef(({ images, selectedImage, onImageSelect, isLoading }, outerRef) => {
    const scrollRef = useRef(null);
    const selectedImageRef = useRef(selectedImage); // Track selected image
    const [loadingThumbnails, setLoadingThumbnails] = useState({});
    const [thumbnailErrors, setThumbnailErrors] = useState({});
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollAnimationRef = useRef(null);
    const keyPressTimerRef = useRef(null);

    // Update selectedImageRef whenever selectedImage changes
    useEffect(() => {
        selectedImageRef.current = selectedImage;
        
        // When selected image changes, ensure it's visible in the filmstrip
        if (selectedImage && !isScrolling) {
            centerSelectedThumbnail(false); // Don't force scroll if already in view
        }
    }, [selectedImage]);

    // Share scrollRef with parent through forwardRef
    useImperativeHandle(outerRef, () => ({
        getScrollPosition: () => scrollRef.current?.scrollLeft || 0,
        setScrollPosition: (position) => {
            if (scrollRef.current) {
                // Use smooth animation for manual scroll position setting
                smoothScrollTo(position, 300);
            }
        }
    }));

    // Smooth scroll function with animation frame for better performance
    const smoothScrollTo = useCallback((targetPosition, duration = 300) => {
        if (!scrollRef.current) return;
        
        // Cancel any existing animation
        if (scrollAnimationRef.current) {
            cancelAnimationFrame(scrollAnimationRef.current);
        }
        
        const startPosition = scrollRef.current.scrollLeft;
        const distance = targetPosition - startPosition;
        const startTime = performance.now();
        
        setIsScrolling(true);
        
        const animateScroll = (currentTime) => {
            const elapsedTime = currentTime - startTime;
            if (elapsedTime >= duration) {
                scrollRef.current.scrollLeft = targetPosition;
                setIsScrolling(false);
                return;
            }
            
            // Easing function for smoother motion
            const progress = elapsedTime / duration;
            const easeProgress = 0.5 - Math.cos(progress * Math.PI) / 2; // Sine easing
            
            scrollRef.current.scrollLeft = startPosition + distance * easeProgress;
            scrollAnimationRef.current = requestAnimationFrame(animateScroll);
        };
        
        scrollAnimationRef.current = requestAnimationFrame(animateScroll);
    }, []);

    // Center the selected thumbnail in view
    const centerSelectedThumbnail = useCallback((forceScroll = true) => {
        if (!selectedImageRef.current || !scrollRef.current) return;
        
        const thumbnailElement = scrollRef.current.querySelector(
            `[data-image-id="${selectedImageRef.current.id}"]`
        );
        
        if (!thumbnailElement) return;
        
        const container = scrollRef.current;
        const containerWidth = container.clientWidth;
        const elementOffset = thumbnailElement.offsetLeft;
        const elementWidth = thumbnailElement.offsetWidth;
        const scrollPosition = elementOffset - (containerWidth - elementWidth) / 2;
        
        // Check if the thumbnail is already fully visible
        const isVisible = 
            elementOffset >= container.scrollLeft && 
            elementOffset + elementWidth <= container.scrollLeft + containerWidth;
            
        // Only scroll if forced or if the thumbnail isn't fully visible
        if (forceScroll || !isVisible) {
            smoothScrollTo(scrollPosition);
        }
    }, [smoothScrollTo]);

    // Improved scroll handler
    const handleScroll = useCallback((direction) => {
        if (!scrollRef.current || isScrolling) return;
        
        const currentScroll = scrollRef.current.scrollLeft;
        const containerWidth = scrollRef.current.clientWidth;
        const scrollAmount = containerWidth * 0.8; // 80% of visible width for better context
        
        const targetScroll = direction === 'left' 
            ? Math.max(0, currentScroll - scrollAmount)
            : currentScroll + scrollAmount;
            
        smoothScrollTo(targetScroll);
    }, [smoothScrollTo, isScrolling]);

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

    // Improved keyboard navigation
    const handleKeyDown = useCallback((e) => {
        if (!images.length || isScrolling) return;

        // Prevent default for arrow keys to avoid page scrolling
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
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
            // We're changing the selected image
            onImageSelect(images[newIndex]);
            
            // Clear any existing timer
            if (keyPressTimerRef.current) {
                clearTimeout(keyPressTimerRef.current);
            }
            
            // Set a short delay to allow the state to update before scrolling
            keyPressTimerRef.current = setTimeout(() => {
                centerSelectedThumbnail(true);
                keyPressTimerRef.current = null;
            }, 10);
        }
    }, [images, onImageSelect, isScrolling, centerSelectedThumbnail]);

    // Use throttle instead of debounce for smoother, more responsive controls
    const throttledKeyDown = useCallback(throttle(handleKeyDown, 100, { leading: true, trailing: false }), [handleKeyDown]);

    useEffect(() => {
        const keyDownHandler = (e) => {
            throttledKeyDown(e);
        };

        window.addEventListener('keydown', keyDownHandler);

        return () => {
            window.removeEventListener('keydown', keyDownHandler);
            throttledKeyDown.cancel();
            
            // Clean up any animations or timers
            if (scrollAnimationRef.current) {
                cancelAnimationFrame(scrollAnimationRef.current);
            }
            if (keyPressTimerRef.current) {
                clearTimeout(keyPressTimerRef.current);
            }
        };
    }, [throttledKeyDown]);
    
    // Listen for scroll end to reset scrolling state
    useEffect(() => {
        const handleScrollEnd = throttle(() => {
            setIsScrolling(false);
        }, 150);
        
        const scrollElement = scrollRef.current;
        if (scrollElement) {
            scrollElement.addEventListener('scroll', handleScrollEnd);
            return () => scrollElement.removeEventListener('scroll', handleScrollEnd);
        }
    }, []);

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
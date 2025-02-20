import React, { forwardRef, useRef, useImperativeHandle, useEffect, useCallback, useState } from 'react';
import { debounce } from 'lodash';

const Filmstrip = forwardRef(({ images, selectedImage, onImageSelect, isLoading }, outerRef) => {
    const scrollRef = useRef(null);
    const selectedImageRef = useRef(selectedImage);
    const [thumbnailsLoaded, setThumbnailsLoaded] = useState({});
    const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false); // Track initial loading

    useEffect(() => {
        selectedImageRef.current = selectedImage;
    }, [selectedImage]);

    useImperativeHandle(outerRef, () => ({
        getScrollPosition: () => scrollRef.current?.scrollLeft || 0,
        setScrollPosition: (position) => {
            if (scrollRef.current) {
                scrollRef.current.scrollLeft = position;
            }
        },
    }));

    const handleScroll = useCallback(
        debounce((direction) => {
            if (scrollRef.current) {
                const scrollAmount = direction === 'left' ? -200 : 200;
                scrollRef.current.scrollLeft += scrollAmount;
            }
        }, 100),
        []
    );

    const handleKeyDown = useCallback(
        (e) => {
            if (!images.length) return;

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
                onImageSelect(images[newIndex]);
                const thumbnailElement = scrollRef.current?.querySelector(`[data-image-id="${images[newIndex].id}"]`);
                if (thumbnailElement && scrollRef.current) {
                    const container = scrollRef.current;
                    const containerWidth = container.clientWidth;
                    const elementOffset = thumbnailElement.offsetLeft;
                    const elementWidth = thumbnailElement.offsetWidth;
                    const scrollPosition = elementOffset - (containerWidth - elementWidth) / 2;

                    container.scrollTo({
                        left: scrollPosition,
                        behavior: 'smooth',
                    });
                }
            }
        },
        [images, onImageSelect]
    );

    const debouncedKeyDown = useCallback(debounce(handleKeyDown, 150), [handleKeyDown]);

    useEffect(() => {
        const keyDownHandler = (e) => {
            debouncedKeyDown(e);
        };

        window.addEventListener('keydown', keyDownHandler);

        return () => {
            window.removeEventListener('keydown', keyDownHandler);
            debouncedKeyDown.cancel();
        };
    }, [debouncedKeyDown]);


    useEffect(() => {
        setThumbnailsLoaded({}); // Reset on new images
        // Mark initial loading as complete after images are fetched
        if (!isLoading) {
            setHasInitiallyLoaded(true);
        }
    }, [images, isLoading]);

      useEffect(() => {
        if(!isLoading) {
            setHasInitiallyLoaded(true);
        }
    }, [isLoading]);

    return (
        <div className="filmstrip-container">
            <button
                className="scroll-button left"
                onClick={() => handleScroll('left')}
                aria-label="Scroll left"
            >
                ‹
            </button>

            <div className="filmstrip-scroll" ref={scrollRef} style={{ backgroundColor: "black" }}>
                <div className="filmstrip">
                    {images.map((image) => {
                        const isSelected = selectedImage?.id === image.id;
                        return (
                            <div
                                key={image.id}
                                data-image-id={image.id}
                                className={`thumbnail ${isSelected ? 'selected' : ''}`}
                                onClick={() => onImageSelect(image)}
                                style={{ backgroundColor: "black" }}
                            >
                                <img
                                    src={image.thumbnail} // Always set the src
                                    alt={image.title}
                                    crossOrigin="anonymous"
                                    loading="lazy"
                                    onLoad={() => {
                                        // Use a setTimeout to ensure the state update happens *after* the current render
                                        setTimeout(() => {
                                             setThumbnailsLoaded(prevLoaded => {
                                                // Prevent unnecessary updates if already loaded
                                                if (prevLoaded[image.id]) {
                                                  return prevLoaded;
                                                }
                                                return { ...prevLoaded, [image.id]: true };
                                              });
                                        }, 0);
                                    }}
                                    onError={() => {
                                        console.error(`Error loading thumbnail: ${image.thumbnail}`);
                                        // Ensure we mark as loaded even on error to avoid infinite retries
                                         setTimeout(() => {
                                              setThumbnailsLoaded(prevLoaded => {
                                                if (prevLoaded[image.id]) {
                                                  return prevLoaded;
                                                }
                                                return { ...prevLoaded, [image.id]: true };
                                              });
                                         }, 0);
                                    }}
                                    style={{
                                        // Hide only AFTER initial load AND if not loaded
                                        display: hasInitiallyLoaded && !thumbnailsLoaded[image.id] ? "none" : "block",
                                        width: '150px',  // Set a fixed width (adjust as needed)
                                        height: '100px', // Set a fixed height (adjust as needed)
                                        objectFit: 'cover', // Ensure images cover the space without distortion
                                    }}
                                />
                                <span className="image-title" style={{ color: "blue" }}>{image.id}</span>
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
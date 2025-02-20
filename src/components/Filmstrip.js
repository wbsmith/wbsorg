import React, { forwardRef, useRef, useImperativeHandle, useEffect, useCallback, useState } from 'react';
import { debounce } from 'lodash';

const Filmstrip = forwardRef(({ images, selectedImage, onImageSelect, isLoading }, outerRef) => {
    const scrollRef = useRef(null);
    const selectedImageRef = useRef(selectedImage);
    const [imageLoaded, setImageLoaded] = useState({});

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


    return (
        <div className="filmstrip-container">
            <button
                className="scroll-button left"
                onClick={() => handleScroll('left')}
                aria-label="Scroll left"
            >
                ‹
            </button>

            <div className="filmstrip-scroll" ref={scrollRef} style={{backgroundColor: "#f0f0f0"}}> {/*Set background color*/}
                <div className="filmstrip">
                    {images.map((image) => {
                        const isSelected = selectedImage?.id === image.id;
                        return (
                            <div
                                key={image.id}
                                data-image-id={image.id}
                                className={`thumbnail ${isSelected ? 'selected' : ''}`}
                                onClick={() => onImageSelect(image)}
                                style={{
                                        backgroundColor: "#f0f0f0",  //Consistent background
                                    }}
                            >
                                <img
                                    src={imageLoaded[image.id] ? image.thumbnail : ""} // Empty string when not loaded
                                    alt={image.title}
                                    crossOrigin="anonymous"
                                    loading="lazy"
                                    onLoad={() => {
                                        setImageLoaded(prevLoaded => ({ ...prevLoaded, [image.id]: true }));
                                    }}
                                    onError={() => {
                                        console.error(`Error loading image: ${image.thumbnail}`);
                                        setImageLoaded(prevLoaded => ({ ...prevLoaded, [image.id]: true }));
                                    }}
                                    style={{
                                      display: isLoading || !imageLoaded[image.id] ? "none" : "block", //Hide until loaded
                                        transition: 'opacity 0.3s ease',
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
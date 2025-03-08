import React from 'react';
import OpenSeadragon from 'openseadragon';
import { Amplify } from 'aws-amplify';
import { uploadData, getUrl, list } from 'aws-amplify/storage';
import Filmstrip from './Filmstrip';
import EXIF from 'exif-js';
import Rating from 'react-rating';
import '/src/styles/index.css'; // Import the updated CSS file

console.log('Amplify available?:', !!Amplify);
console.log('Storage methods available?:', !!list, !!getUrl);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const App = () => {
  const [images, setImages] = React.useState([]);
  const [selectedImage, setSelectedImage] = React.useState(null);
  const [viewer, setViewer] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [exifData, setExifData] = React.useState(null);
  const [ratings, setRatings] = React.useState({});
  const [errorMessage, setErrorMessage] = React.useState(null);
  const filmstripRef = React.useRef(null);
  const urlCache = React.useRef(new Map()); // Cache URLs
  const urlRefreshQueue = React.useRef(new Set()); // Queue of URLs to refresh

  const getPreSignedUrl = async (key, retryCount = 0, forceRefresh = false) => {
    // Check cache first (unless force refresh is requested)
    if (!forceRefresh && urlCache.current.has(key)) {
      const { url, expiry } = urlCache.current.get(key);
      // Return cached URL if it's not expiring soon (more than 5 minutes left)
      if (expiry > Date.now() + 5 * 60 * 1000) {
        return url;
      }
      // If URL is expiring soon, continue to refresh it
    }

    try {
      console.log('Getting new URL for key:', key);
      const result = await getUrl({ key, options: { expires: 60 * 60 } }); // 1-hour expiry
      const url = result.url.href;

      // Cache with expiry time (1 hour minus 10 minutes buffer for safety)
      const expiry = Date.now() + (50 * 60 * 1000);
      urlCache.current.set(key, { url, expiry });

      return url;
    } catch (error) {
      console.error(`Error generating signed URL for ${key}:`, error);
      
      // Implement better backoff strategy
      if (error.message?.includes('Too Many Requests') && retryCount < 3) {
        const backoffTime = Math.pow(2, retryCount) * 1000;
        console.log(`Rate limited, waiting ${backoffTime}ms before retry ${retryCount+1}/3`);
        await delay(backoffTime);
        return getPreSignedUrl(key, retryCount + 1, forceRefresh);
      }
      
      // If we still have a cached URL, return it as fallback even if expired
      if (urlCache.current.has(key)) {
        console.log(`Using expired URL for ${key} as fallback`);
        // Add to refresh queue to try again later
        urlRefreshQueue.current.add(key);
        return urlCache.current.get(key).url;
      }
      
      throw error;
    }
  };

  const refreshUrls = async (imagesToRefresh = images) => {
    if (isRefreshing) return;
    setIsRefreshing(true);

    try {
      // Save scroll position
      const scrollPosition = filmstripRef.current?.getScrollPosition() || 0;
      const batchSize = 5;
      const updatedImages = [...images]; // Create a copy to modify

      // Process in batches to avoid rate limiting
      for (let i = 0; i < imagesToRefresh.length; i += batchSize) {
        const batch = imagesToRefresh.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (image) => {
            try {
              // Force refresh the URLs
              const fullImageUrl = await getPreSignedUrl(image.key, 0, true);
              const thumbnailUrl = await getPreSignedUrl(`thumbnails/${image.id}`, 0, true);
              
              // Update in our copied array
              const index = updatedImages.findIndex(img => img.id === image.id);
              if (index !== -1) {
                updatedImages[index] = {
                  ...image,
                  url: fullImageUrl,
                  thumbnail: thumbnailUrl,
                };
              }
            } catch (error) {
              console.error(`Failed to refresh URLs for image ${image.id}:`, error);
              // Don't update this image's URLs if refresh failed
            }
          })
        );
        await delay(200); // Shorter delay between batches
      }

      // Only update state if we have changes
      setImages(updatedImages);

      // Also refresh the selected image if it was in the batch
      if (selectedImage && imagesToRefresh.some(img => img.id === selectedImage.id)) {
        try {
          const newUrl = await getPreSignedUrl(selectedImage.key, 0, true);
          const updatedSelected = { ...selectedImage, url: newUrl };
          setSelectedImage(updatedSelected);

          if (viewer) {
            viewer.open({
              type: 'image',
              url: newUrl,
              crossOriginPolicy: 'Anonymous',
              buildPyramid: false,
            });
          }
        } catch (error) {
          console.error('Failed to refresh selected image URL:', error);
          setErrorMessage('Failed to load the selected image. Please try again later.');
        }
      }

      // Process any queued URLs that need refreshing
      if (urlRefreshQueue.current.size > 0) {
        console.log(`Processing ${urlRefreshQueue.current.size} queued URLs for refresh`);
        const queuedKeys = [...urlRefreshQueue.current];
        for (const key of queuedKeys) {
          try {
            await getPreSignedUrl(key, 0, true);
            urlRefreshQueue.current.delete(key);
          } catch (error) {
            console.error(`Failed to refresh queued URL for key ${key}:`, error);
            // Keep in queue for next attempt
          }
        }
      }

      // Restore scroll position
      filmstripRef.current?.setScrollPosition(scrollPosition);

    } catch (error) {
      console.error('Error refreshing URLs:', error);
      setErrorMessage('Error refreshing image data. Please try again later.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleImageSelect = React.useCallback(async (image) => {
    setSelectedImage(image);
    setErrorMessage(null); // Clear any previous error messages
    
    if (viewer) {
      try {
        // Check if URL might be stale and refresh if needed
        let imageUrl = image.url;
        if (urlCache.current.has(image.key)) {
          const { expiry } = urlCache.current.get(image.key);
          if (expiry < Date.now() + 10 * 60 * 1000) { // Less than 10 minutes left
            imageUrl = await getPreSignedUrl(image.key, 0, true);
            // Update image in state with new URL
            setSelectedImage(prev => prev && prev.id === image.id ? {...prev, url: imageUrl} : prev);
          }
        }
        
        // Open image in viewer
        viewer.open({
          type: 'image',
          url: imageUrl,
          crossOriginPolicy: 'Anonymous',
          buildPyramid: false,
        });
      } catch (error) {
        console.error('Error opening image:', error);
        setErrorMessage('Failed to load the selected image. Please try again later.');
        
        // Try to recover
        try {
          const newUrl = await getPreSignedUrl(image.key, 0, true);
          const updatedImage = { ...image, url: newUrl };
          setSelectedImage(updatedImage);
          
          viewer.open({
            type: 'image',
            url: newUrl,
            crossOriginPolicy: 'Anonymous',
            buildPyramid: false,
          });
        } catch (retryError) {
          console.error('Retry failed:', retryError);
          setErrorMessage('Failed to load the image. Please select another image or refresh the page.');
        }
      }
    }
  }, [viewer]);

  const fetchExifData = (imageUrl) => {
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      EXIF.getData(img, () => {
        const exif = EXIF.getAllTags(img);
        setExifData(exif);
      });
    };
    img.onerror = () => {
      setErrorMessage('Failed to load EXIF data. Please try again later.');
    };
  };

  const handleRatingChange = (imageId, rating) => {
    setRatings((prevRatings) => ({
      ...prevRatings,
      [imageId]: rating,
    }));
    // Here you can add code to save the rating to your backend
    console.log(`Image ${imageId} rated ${rating}`);
  };

  const recoverFromError = async () => {
    setErrorMessage('Attempting to recover...');
    
    try {
      // First, try to refresh all URLs
      await refreshUrls();
      
      // If we have a selected image, try reloading it
      if (selectedImage && viewer) {
        const newUrl = await getPreSignedUrl(selectedImage.key, 0, true);
        const updatedImage = { ...selectedImage, url: newUrl };
        setSelectedImage(updatedImage);
        
        viewer.open({
          type: 'image',
          url: newUrl,
          crossOriginPolicy: 'Anonymous',
          buildPyramid: false,
        });
      }
      
      setErrorMessage(null);
    } catch (error) {
      console.error('Recovery failed:', error);
      setErrorMessage('Recovery failed. Please refresh the page.');
    }
  };

  React.useEffect(() => {
    const fetchImages = async () => {
      try {
        console.log('Starting fetchImages');
        console.log('Attempting to list images from full_imgs/');
        const response = await list({ prefix: 'full_imgs/' });
        console.log('List response:', response);

        const imageList = await Promise.all(
          response.items
            .filter(item => item.key.match(/\.(jpg|jpeg|png)$/i))
            .map(async item => {
              const filename = item.key.split('/').pop();
              const fullImageUrl = await getPreSignedUrl(item.key);
              const thumbnailUrl = await getPreSignedUrl(`thumbnails/${filename}`);

              return {
                id: filename,
                url: fullImageUrl,
                title: filename,
                thumbnail: thumbnailUrl,
                key: item.key
              };
            })
        );

        console.log('Processed images:', imageList);
        setImages(imageList);
      } catch (error) {
        console.error('Error in fetchImages:', error);
        setErrorMessage('Failed to load images. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();

    const viewer = OpenSeadragon({
      id: 'openseadragon-viewer',
      prefixUrl: 'https://cdn.jsdelivr.net/npm/openseadragon@3.1/build/openseadragon/images/',
      crossOriginPolicy: 'Anonymous',
      loadTilesWithAjax: true, // Important for handling CORS with pre-signed URLs
      animationTime: 0.3,
      blendTime: 0.1,
      constrainDuringPan: true,
      maxZoomPixelRatio: 2, // Increased for potentially sharper images, adjust as needed.
      minZoomLevel: 0.5,
      visibilityRatio: 0.8,
      gestureSettingsMouse: {
        scrollToZoom: true,
        clickToZoom: false,
        dblClickToZoom: true,
        pinchToZoom: true
      },
      showNavigator: false,
      showReferenceStrip: false,
      defaultZoomLevel: 0,
      timeout: 120000,
      // Removed immediateRender. Let OpenSeaDragon Handle Rendering.
    });

    viewer.addHandler('tile-load-failed', async (event) => {
      console.warn('Tile load failed:', event);
      
      // Try to get the image key from the event
      if (selectedImage) {
        try {
          // Force refresh just this image's URL
          const newUrl = await getPreSignedUrl(selectedImage.key, 0, true);
          console.log('Refreshed URL after tile load failure:', newUrl);
          
          // Update the image in our state
          const updatedSelected = { ...selectedImage, url: newUrl };
          setSelectedImage(updatedSelected);
          
          // Retry loading the image with the new URL
          viewer.open({
            type: 'image',
            url: newUrl,
            crossOriginPolicy: 'Anonymous',
            buildPyramid: false,
          });
        } catch (error) {
          console.error('Failed to refresh URL after tile load failure:', error);
          setErrorMessage('Image loading error. Please select another image or try again later.');
        }
      }
    });

    viewer.addHandler('open-failed', async (event) => {
      console.warn('Open failed:', event);
      setErrorMessage('Failed to load the image.');
      
      if (selectedImage) {
        try {
          // Force refresh just this image's URL
          const newUrl = await getPreSignedUrl(selectedImage.key, 0, true);
          console.log('Refreshed URL after open failure:', newUrl);
          
          // Update the image in our state
          const updatedSelected = { ...selectedImage, url: newUrl };
          setSelectedImage(updatedSelected);
          
          // Retry loading the image with the new URL
          setTimeout(() => {
            viewer.open({
              type: 'image',
              url: newUrl,
              crossOriginPolicy: 'Anonymous',
              buildPyramid: false,
            });
          }, 500); // Small delay to allow UI to update
        } catch (error) {
          console.error('Failed to refresh URL after open failure:', error);
        }
      }
    });

    viewer.addHandler('error', async function(event) {
      console.log('Viewer error, attempting recovery');
      setErrorMessage('Viewer error occurred. Attempting to recover...');
      
      if (selectedImage) {
        try {
          // Force refresh the URL and retry
          const newUrl = await getPreSignedUrl(selectedImage.key, 0, true);
          const updatedSelected = { ...selectedImage, url: newUrl };
          setSelectedImage(updatedSelected);
          
          viewer.open({
            type: 'image',
            url: newUrl,
            crossOriginPolicy: 'Anonymous',
            buildPyramid: false,
          });
        } catch (error) {
          console.error('Recovery failed:', error);
          setErrorMessage('Recovery failed. Please try selecting another image or refresh the page.');
        }
      }
    });

    setViewer(viewer);

    return () => {
      viewer.destroy();
    };
  }, []);

  React.useEffect(() => {
    if (viewer && images.length > 0 && !selectedImage) {
      handleImageSelect(images[0]);
    }
  }, [viewer, images, selectedImage, handleImageSelect]);

  // Proactive URL refreshing
  React.useEffect(() => {
    // Check for URLs that will expire soon and refresh them
    const proactiveRefresh = async () => {
      if (images.length === 0 || isRefreshing) return;
      
      // Find images with URLs that will expire in the next 10 minutes
      const soonExpiringImages = images.filter(img => {
        if (!urlCache.current.has(img.key)) return true;
        const { expiry } = urlCache.current.get(img.key);
        return expiry < Date.now() + 10 * 60 * 1000; // 10 minute buffer
      });
      
      if (soonExpiringImages.length > 0) {
        console.log(`Proactively refreshing ${soonExpiringImages.length} soon-to-expire URLs`);
        await refreshUrls(soonExpiringImages);
      }
    };

    // Run initially and set interval
    proactiveRefresh();
    const interval = setInterval(proactiveRefresh, 5 * 60 * 1000); // Check every 5 minutes
    
    return () => clearInterval(interval);
  }, [images, isRefreshing]);

  return (
    <div className="app-container">
      <header>
        <h1>Full Image Gallery</h1>
      </header>

      <main>
        <div className="viewer-section">
          <div
            id="openseadragon-viewer"
            className="viewer-container"
          />
          {selectedImage && (
            <div>
              <div className="rating-container">
                <Rating
                  initialRating={ratings[selectedImage.id] || 0}
                  emptySymbol={<span className="rating-star">☆</span>}
                  fullSymbol={<span className="rating-star">★</span>}
                  onChange={(rate) => handleRatingChange(selectedImage.id, rate)}
                />
              </div>
              <button className="exif-button" onClick={() => fetchExifData(selectedImage.url)}>View EXIF</button>
            </div>
          )}
          {exifData && (
            <div className="exif-modal">
              <div className="exif-content">
                <button onClick={() => setExifData(null)}>Close</button>
                <pre>{JSON.stringify(exifData, null, 2)}</pre>
              </div>
            </div>
          )}
          {errorMessage && (
            <div className="error-message">
              {errorMessage}
              <button 
                onClick={recoverFromError} 
                className="recovery-button"
                style={{ marginLeft: '10px', padding: '5px 10px' }}
              >
                Try to recover
              </button>
            </div>
          )}
        </div>

        <Filmstrip
          ref={filmstripRef}
          images={images}
          selectedImage={selectedImage}
          onImageSelect={handleImageSelect}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
};

export default App;
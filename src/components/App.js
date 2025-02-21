import React from 'react';
import OpenSeadragon from 'openseadragon';
import { Amplify } from 'aws-amplify';
import { uploadData, getUrl, list } from 'aws-amplify/storage';
import Filmstrip from './Filmstrip';

console.log('Amplify available?:', !!Amplify);
console.log('Storage methods available?:', !!list, !!getUrl);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const App = () => {
  const [images, setImages] = React.useState([]);
  const [selectedImage, setSelectedImage] = React.useState(null);
  const [viewer, setViewer] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const filmstripRef = React.useRef(null);
  const urlCache = React.useRef(new Map()); // Cache URLs

  const getPreSignedUrl = async (key, retryCount = 0) => {
    // Check cache first
    if (urlCache.current.has(key)) {
      const { url, expiry } = urlCache.current.get(key);
      if (expiry > Date.now()) {
        return url;
      }
    }

    try {
      console.log('Attempting to get URL for key:', key);
      const result = await getUrl({ key, options: { expires: 60 * 60 } }); // 1-hour expiry
      const url = result.url.href;

      // Cache the URL with expiry time
      const expiry = Date.now() + (60 * 60 * 1000) - (5 * 60 * 1000); // Expire 5 minutes early
      urlCache.current.set(key, { url, expiry });

      return url;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      if (error.message?.includes('Too Many Requests') && retryCount < 3) {
        const backoffTime = Math.pow(2, retryCount) * 1000;
        console.log(`Rate limited, waiting ${backoffTime}ms before retry`);
        await delay(backoffTime);
        return getPreSignedUrl(key, retryCount + 1);
      }
      throw error;
    }
  };

  const refreshUrls = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);

    try {
      const scrollPosition = filmstripRef.current?.getScrollPosition() || 0;
      const batchSize = 5;
      const updatedImages = [...images]; // Create a copy to modify

      for (let i = 0; i < images.length; i += batchSize) {
        const batch = images.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (image) => {
            try {
              const fullImageUrl = await getPreSignedUrl(image.key);
              const thumbnailUrl = await getPreSignedUrl(`thumbnails/${image.id}`);
               // Find the index in the copied array
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
               const index = updatedImages.findIndex(img => img.id === image.id);
                if (index !== -1) {
                    updatedImages[index] = image; //Keep Old Image and URL if error.
                }
            }
          })
        );
        await delay(200); // Shorter delay between batches
      }

        setImages(updatedImages);

      if (selectedImage) {
        try {
          const newUrl = await getPreSignedUrl(selectedImage.key);
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
        }
      }

      // Restore scroll position (no need for requestAnimationFrame)
      filmstripRef.current?.setScrollPosition(scrollPosition);

    } catch (error) {
      console.error('Error refreshing URLs:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleImageSelect = React.useCallback(async (image) => {
      setSelectedImage(image);
      if (viewer) {
          try {
              // No need to pre-fetch. OpenSeadragon handles loading.  Just open.
              viewer.open({
                  type: 'image',
                  url: image.url,
                  crossOriginPolicy: 'Anonymous',
                  buildPyramid: false,
              });
          } catch (error) {
              console.error('Error in openImage:', error);
              if (!isRefreshing) {
                  await refreshUrls();
              }
          }
      }
  }, [viewer, isRefreshing]);

//   const handleImageSelect = React.useCallback(async (image) => {
//     setSelectedImage(image);
//     if (viewer) {
//         try {
//             viewer.open({
//                 type: 'image',
//                 url: image.url,
//                 crossOriginPolicy: 'Anonymous',
//                 buildPyramid: false,
//             });
//             // Preload next and previous images
//             const currentIndex = images.findIndex(img => img.id === image.id);
//             const nextImage = images[currentIndex + 1];
//             const prevImage = images[currentIndex - 1];
//             if (nextImage) {
//                 new Image().src = nextImage.url;
//             }
//             if (prevImage) {
//                 new Image().src = prevImage.url;
//             }
//         } catch (error) {
//             console.error('Error in openImage:', error);
//             if (!isRefreshing) {
//                 await refreshUrls();
//             }
//         }
//     }
// }, [viewer, isRefreshing, images]);


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
        //Removed immediateRender.  Let OpenSeaDragon Handle Rendering.
    });

    viewer.addHandler('tile-load-failed', async (event) => {
      console.warn('Tile load failed:', event);
      // Don't prevent default. OSD needs to know the tile failed.
      // Instead, refresh URLs *without* blocking the main thread.
      if (!isRefreshing) {
        refreshUrls(); // No `await` here.
      }
    });

    viewer.addHandler('open-failed', async (event) => {
        console.warn('Open failed:', event);
        if (!isRefreshing) {
            refreshUrls();
        }
    });
      viewer.addHandler('error', async function(event) {
        console.log('Viewer error, attempting refresh');
        if (!isRefreshing) {
          refreshUrls();
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

    //Reduced Refresh to every 30 minutes, and now it checks for existing cache.
   React.useEffect(() => {
        const regenerateUrls = async () => {
            if (images.length === 0) return;
            // Only refresh if there are no valid URLs in the cache
            if (!images.every(img => urlCache.current.has(img.key) && urlCache.current.get(img.key).expiry > Date.now())) {
                await refreshUrls();
            }
        };

        const interval = setInterval(regenerateUrls, 30 * 60 * 1000); // 30 minutes
        return () => clearInterval(interval);
    }, [images, selectedImage, viewer]);

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
import React from 'react';
import OpenSeadragon from 'openseadragon';
import { Amplify } from 'aws-amplify';
import { uploadData, getUrl, list } from 'aws-amplify/storage';
import Filmstrip from './Filmstrip';

// More defensive debugging
console.log('Amplify available?:', !!Amplify);
console.log('Storage methods available?:', !!list, !!getUrl);

const App = () => {
  const [images, setImages] = React.useState([]);
  const [selectedImage, setSelectedImage] = React.useState(null);
  const [viewer, setViewer] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const filmstripRef = React.useRef(null);

  // Add error checking to getPreSignedUrl
  const getPreSignedUrl = async (key) => {
    try {
      console.log('Attempting to get URL for key:', key);
      const result = await getUrl({ key, options: { expires: 120 }});
      return result.url.href;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      // If this is during initialization, we want to throw
      throw error;
    }
  };

  // Modify refreshUrls to keep existing thumbnails until new ones are ready
  const refreshUrls = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    
    try {
      const scrollPosition = filmstripRef.current?.getScrollPosition() || 0;

      // Create new image list but don't update state yet
      const updatedImages = await Promise.all(
        images.map(async (image) => {
          try {
            const fullImageUrl = await getPreSignedUrl(image.key);
            const thumbnailUrl = await getPreSignedUrl(`thumbnails/${image.id}`);
            return {
              ...image,
              url: fullImageUrl,
              thumbnail: thumbnailUrl
            };
          } catch (error) {
            console.error(`Failed to refresh URLs for image ${image.id}:`, error);
            return image; // Keep existing URLs if refresh fails
          }
        })
      );

      // Only update state if we got new URLs
      if (updatedImages.some(img => img.url !== images.find(i => i.id === img.id)?.url)) {
        setImages(updatedImages);
      }
      
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
              immediateRender: true
            });
          }
        } catch (error) {
          console.error('Failed to refresh selected image URL:', error);
        }
      }

      setTimeout(() => {
        requestAnimationFrame(() => {
          filmstripRef.current?.setScrollPosition(scrollPosition);
        });
      }, 0);

    } catch (error) {
      console.error('Error refreshing URLs:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Modify handleImageSelect to handle 403s
  const handleImageSelect = React.useCallback((image) => {
    setSelectedImage(image);
    if (viewer) {
      const openImage = async () => {
        try {
          // First try to fetch the image to check if URL is still valid
          const response = await fetch(image.url);
          if (response.status === 403) {
            console.log('URL expired, refreshing...');
            await refreshUrls();
            return;
          }

          await viewer.open({
            type: 'image',
            url: image.url,
            crossOriginPolicy: 'Anonymous',
            buildPyramid: false,
            immediateRender: true,
            success: function() {
              console.log('Image loaded successfully');
            },
            error: async function(err) {
              console.error('Error loading image:', err);
              if (!isRefreshing) {
                await refreshUrls();
                // Try loading the image again after refresh
                const updatedImage = images.find(img => img.id === image.id);
                if (updatedImage) {
                  viewer.open({
                    type: 'image',
                    url: updatedImage.url,
                    crossOriginPolicy: 'Anonymous',
                    buildPyramid: false,
                    immediateRender: true
                  });
                }
              }
            }
          });
        } catch (error) {
          console.error('Error in openImage:', error);
          if (!isRefreshing) {
            await refreshUrls();
          }
        }
      };
      openImage();
    }
  }, [viewer, isRefreshing, images]);

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
      loadTilesWithAjax: true,
      animationTime: 0.3,
      blendTime: 0.1,
      constrainDuringPan: true,
      maxZoomPixelRatio: 1,
      minZoomLevel: 0.5,
      maxZoomLevel: 5,
      visibilityRatio: 0.8,
      immediateRender: true,
      gestureSettingsMouse: {
        scrollToZoom: true,
        clickToZoom: false,
        dblClickToZoom: true,
        pinchToZoom: true
      },
      showNavigator: false,
      showReferenceStrip: false,
      defaultZoomLevel: 0,
      preserveZoom: true,
      failIfMaxZoomPixelRatioExceeded: false,
      placeholderFillStyle: '#000',
      timeout: 120000
    });
    
    // Add comprehensive error handling
    viewer.addHandler('tile-load-failed', async function(event) {
      console.log('Tile load failed, attempting refresh');
      if (event && event.preventDefault) {
        event.preventDefault();
      }
      if (!isRefreshing) {
        await refreshUrls();
      }
    });

    viewer.addHandler('open-failed', async function(event) {
      console.log('Open failed, attempting refresh');
      if (event && event.preventDefault) {
        event.preventDefault();
      }
      if (!isRefreshing) {
        await refreshUrls();
      }
    });

    viewer.addHandler('error', async function(event) {
      console.log('Viewer error, attempting refresh');
      if (event && event.preventDefault) {
        event.preventDefault();
      }
      if (!isRefreshing) {
        await refreshUrls();
      }
    });
    
    viewer.addHandler('open', function() {
      console.log('Viewer is ready and image is loaded');
    });
    
    setViewer(viewer);

    return () => {
      viewer.destroy();
    };
  }, []);

  // Initial image selection
  React.useEffect(() => {
    if (viewer && images.length > 0 && !selectedImage) {
      handleImageSelect(images[0]);
    }
  }, [viewer, images, selectedImage, handleImageSelect]);

  // URL regeneration logic
  React.useEffect(() => {
    const regenerateUrls = async () => {
      if (images.length === 0) return;
      await refreshUrls();
    };

    const interval = setInterval(regenerateUrls, 50 * 60 * 1000);
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
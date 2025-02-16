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

  const handleImageSelect = React.useCallback((image) => {
    setSelectedImage(image);
    if (viewer) {
      viewer.open({
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
          // Try to refresh URLs if image fails to load
          if (!isRefreshing) {
            await refreshUrls();
          }
        }
      });
    }
  }, [viewer, isRefreshing]);

  // Get pre-signed URL using Amplify Storage
  const getPreSignedUrl = async (key) => {
    try {
      console.log('Attempting to get URL for key:', key);
      const result = await getUrl({ key, options: { expires: 3600 }});
      return result.url.href;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }
  };

  // Add refresh URLs function
  const refreshUrls = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    
    try {
      // Store scroll position before update
      const scrollPosition = filmstripRef.current?.getScrollPosition() || 0;

      const updatedImages = await Promise.all(
        images.map(async (image) => ({
          ...image,
          url: await getPreSignedUrl(image.key),
          thumbnail: await getPreSignedUrl(`thumbnails/${image.id}`)
        }))
      );
      setImages(updatedImages);
      
      // Update selected image if there is one
      if (selectedImage) {
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
      }

      // Restore scroll position after update
      requestAnimationFrame(() => {
        filmstripRef.current?.setScrollPosition(scrollPosition);
      });
    } catch (error) {
      console.error('Error refreshing URLs:', error);
    } finally {
      setIsRefreshing(false);
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
      showNavigator: false,  // Suppress default UI elements
      showReferenceStrip: false,  // Suppress default UI elements
      defaultZoomLevel: 0,
      preserveZoom: true
    });
    
    viewer.addHandler('open', function() {
      console.log('Viewer is ready and image is loaded');
    });
    
    viewer.addHandler('open-failed', async function() {
      if (!isRefreshing) {
        await refreshUrls();
      }
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
import React from 'react';
import OpenSeadragon from 'openseadragon';
import { Amplify } from 'aws-amplify';
import { uploadData, getUrl, list } from 'aws-amplify/storage';
import Filmstrip from './Filmstrip';

const App = () => {
  const [images, setImages] = React.useState([]);
  const [selectedImage, setSelectedImage] = React.useState(null);
  const [viewer, setViewer] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Get pre-signed URL using Amplify Storage
  const getPreSignedUrl = async (key) => {
    try {
      const result = await getUrl({ key, options: { expires: 3600 }});
      return result.url.href;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }
  };

  // Refresh URLs for all images
  const refreshUrls = async () => {
    if (isRefreshing) return; // Prevent multiple simultaneous refreshes
    
    setIsRefreshing(true);
    try {
      const updatedImages = await Promise.all(
        images.map(async (image) => ({
          ...image,
          url: await getPreSignedUrl(image.key),
          thumbnail: await getPreSignedUrl(`thumbnails/${image.id}`)
        }))
      );
      setImages(updatedImages);
      
      // If there's a selected image, update its URL and refresh the viewer
      if (selectedImage) {
        const newUrl = await getPreSignedUrl(selectedImage.key);
        setSelectedImage(prev => ({ ...prev, url: newUrl }));
        
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
    } catch (error) {
      console.error('Error refreshing URLs:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle image loading errors
  const handleImageError = async () => {
    if (!isRefreshing) {
      console.log('Image load failed, attempting to refresh URLs');
      await refreshUrls();
    }
  };

  React.useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await list({ 
          prefix: 'public/full_imgs/',
          options: { accessLevel: 'guest' }
        });
        
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

        setImages(imageList);
      } catch (error) {
        console.error('Error in fetchImages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();

    // Initialize OpenSeadragon with error handling
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
      // Suppress token display and handle errors
      onerror: handleImageError,
      showReferenceStrip: false,
      showNavigator: false,
      // Disable default error messages
      showNavigationControl: false
    });
    
    viewer.addHandler('open-failed', handleImageError);
    viewer.addHandler('tile-load-failed', handleImageError);
    
    setViewer(viewer);

    return () => {
      viewer.destroy();
    };
  }, []);

  const handleImageSelect = React.useCallback(async (image) => {
    setSelectedImage(image);
    if (viewer) {
      try {
        viewer.open({
          type: 'image',
          url: image.url,
          crossOriginPolicy: 'Anonymous',
          buildPyramid: false,
          immediateRender: true,
          success: function() {
            console.log('Image loaded successfully');
          },
          error: handleImageError
        });
      } catch (error) {
        console.error('Error loading image:', error);
        await handleImageError();
      }
    }
  }, [viewer, handleImageError]);

  return (
    <div className="app-container">
      <header>
        <h1>Photo Gallery</h1>
      </header>
      
      <main>
        <div className="viewer-section">
          <div 
            id="openseadragon-viewer" 
            className="viewer-container"
          />
        </div>
        
        <Filmstrip
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
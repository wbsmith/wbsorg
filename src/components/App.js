import React from 'react';
import OpenSeadragon from 'openseadragon';
import { Amplify } from 'aws-amplify';
import { getUrl, list } from 'aws-amplify/storage';
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
    if (isRefreshing) return;
    
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
        console.log('Starting fetchImages');
        const response = await list({ 
          prefix: 'full_imgs/',
          options: { 
            accessLevel: 'guest'
          }
        });
        
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

    // Initialize OpenSeadragon
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
      preserveZoom: true
    });
    
    viewer.addHandler('open', function() {
      console.log('Viewer is ready and image is loaded');
    });

    viewer.addHandler('open-failed', handleImageError);
    viewer.addHandler('tile-load-failed', handleImageError);
    
    setViewer(viewer);

    return () => {
      viewer.destroy();
    };
  }, []);

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
          await handleImageError();
        }
      });
    }
  }, [viewer]);

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
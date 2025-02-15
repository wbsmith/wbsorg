import React from 'react';
import OpenSeadragon from 'openseadragon';
import { Storage } from 'aws-amplify';
import Filmstrip from './Filmstrip';

const App = () => {
  const [images, setImages] = React.useState([]);
  const [selectedImage, setSelectedImage] = React.useState(null);
  const [viewer, setViewer] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Get pre-signed URL using Amplify Storage
  const getPreSignedUrl = async (key) => {
    try {
      return await Storage.get(key, { expires: 3600 });
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }
  };

  React.useEffect(() => {
    const fetchImages = async () => {
      try {
        // List objects in the bucket using Amplify Storage
        const response = await Storage.list('full_imgs/');
        
        const imageList = await Promise.all(
          response
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
        console.error('Error fetching images:', error);
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

  // URL regeneration logic
  React.useEffect(() => {
    const regenerateUrls = async () => {
      if (images.length === 0) return;

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
          const updatedUrl = await getPreSignedUrl(selectedImage.key);
          setSelectedImage(prev => ({ ...prev, url: updatedUrl }));
          
          if (viewer) {
            viewer.open({
              type: 'image',
              url: updatedUrl,
              crossOriginPolicy: 'Anonymous',
              buildPyramid: false,
              immediateRender: true
            });
          }
        }
      } catch (error) {
        console.error('Error regenerating URLs:', error);
      }
    };

    const interval = setInterval(regenerateUrls, 50 * 60 * 1000);
    return () => clearInterval(interval);
  }, [images, selectedImage, viewer]);

  // Initial image selection
  React.useEffect(() => {
    if (viewer && images.length > 0 && !selectedImage) {
      handleImageSelect(images[0]);
    }
  }, [viewer, images, selectedImage]);

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
        error: function(err) {
          console.error('Error loading image:', err);
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
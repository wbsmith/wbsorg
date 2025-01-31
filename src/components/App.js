// src/components/App.js
import React from 'react';
import OpenSeadragon from 'openseadragon';
import Filmstrip from './Filmstrip';

const App = () => {
  const [images, setImages] = React.useState([]);
  const [selectedImage, setSelectedImage] = React.useState(null);
  const [viewer, setViewer] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchImages = async () => {
      try {
        setIsLoading(true);
        const bucketUrl = 'https://s3.us-west-1.amazonaws.com/wbryansmith.org';
        const response = await fetch(`${bucketUrl}?list-type=2&prefix=full_imgs/`);
        const data = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, "text/xml");
        const contents = xmlDoc.getElementsByTagName("Contents");
        
        const imageList = Array.from(contents)
          .map(item => {
            const key = item.getElementsByTagName("Key")[0].textContent;
            if (key.match(/\.(jpg|jpeg|png)$/i)) {
              return {
                id: key.split('/').pop(),
                url: `${bucketUrl}/${key}`,
                title: key.split('/').pop(),
                // Will add thumbnail path once you create them
                thumbnail: `${bucketUrl}/full_imgs/thumbnails/${key.split('/').pop()}`,
                lastModified: new Date(item.getElementsByTagName("LastModified")[0].textContent)
              };
            }
            return null;
          })
          .filter(item => item !== null)
          .sort((a, b) => b.lastModified - a.lastModified);

        setImages(imageList);
        if (imageList.length > 0) {
          handleImageSelect(imageList[0]);
        }
      } catch (error) {
        console.error('Error fetching images:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();

    // Initialize OpenSeadragon with optimized settings
    const viewer = OpenSeadragon({
      id: 'openseadragon-viewer',
      prefixUrl: 'https://cdn.jsdelivr.net/npm/openseadragon@3.1/build/openseadragon/images/',
      crossOriginPolicy: 'Anonymous',
      loadTilesWithAjax: true,
      ajaxHeaders: {
        'Access-Control-Allow-Origin': '*'
      },
      // Performance optimizations
      animationTime: 0.3,
      blendTime: 0.1,
      constrainDuringPan: true,
      maxZoomPixelRatio: 1,
      minZoomLevel: 0.5,
      maxZoomLevel: 5,
      visibilityRatio: 0.8,
      immediateRender: true,
      preload: true,
      debugMode: false,
      // Mouse settings
      gestureSettingsMouse: {
        scrollToZoom: true,
        clickToZoom: false,
        dblClickToZoom: true,
        pinchToZoom: true
      },
      // Tile settings for better performance
      tileCache: {
        maxImageCacheCount: 200
      },
      // Disable unnecessary features
      showNavigator: false,
      autoHideControls: true
    });

    setViewer(viewer);

    return () => {
      viewer.destroy();
    };
  }, []);

  const handleImageSelect = React.useCallback((image) => {
    setSelectedImage(image);
    if (viewer) {
      // Use requestAnimationFrame for smoother transitions
      requestAnimationFrame(() => {
        viewer.open({
          type: 'image',
          url: image.url,
          crossOriginPolicy: 'Anonymous',
          buildPyramid: false,
          ajaxWithCredentials: false,
          immediateRender: true,
          success: () => {
            viewer.viewport.goHome(true);
          }
        });
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

export default React.memo(App);
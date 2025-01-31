import React from 'react';
import OpenSeadragon from 'openseadragon';
import Filmstrip from './Filmstrip';

const App = () => {
  const [images, setImages] = React.useState([]);
  const [selectedImage, setSelectedImage] = React.useState(null);
  const [viewer, setViewer] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const handleImageSelect = React.useCallback((image) => {
    setSelectedImage(image);
    if (viewer) {
      viewer.open({
        type: 'image',
        url: image.url,
        crossOriginPolicy: 'Anonymous',
        buildPyramid: false,
        immediateRender: true
      });
    }
  }, [viewer]);

  React.useEffect(() => {
    let mounted = true;

    const fetchImages = async () => {
      try {
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
              const filename = key.split('/').pop();
              return {
                id: filename,
                url: `${bucketUrl}/${key}`,
                title: filename,
                thumbnail: `${bucketUrl}/thumbnails/${filename}`,
                lastModified: new Date(item.getElementsByTagName("LastModified")[0].textContent)
              };
            }
            return null;
          })
          .filter(item => item !== null)
          .sort((a, b) => b.lastModified - a.lastModified);

        if (mounted) {
          setImages(imageList);
          
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

          setViewer(viewer);

          // Wait a bit for viewer to initialize before loading first image
          setTimeout(() => {
            if (imageList.length > 0) {
              handleImageSelect(imageList[0]);
            }
          }, 100);
        }
      } catch (error) {
        console.error('Error fetching images:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchImages();

    return () => {
      mounted = false;
      if (viewer) {
        viewer.destroy();
      }
    };
  }, [handleImageSelect]);

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
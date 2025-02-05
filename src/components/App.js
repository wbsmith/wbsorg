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
              thumbnail: `${bucketUrl}/thumbnails/${filename}`
            };
          }
          return null;
        })
        .filter(item => item !== null);

        setImages(imageList);
        // if (imageList.length > 0) {
        //   handleImageSelect(imageList[0]);
        // }
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

  // Add a new useEffect to handle initial image selection
  React.useEffect(() => {
    if (viewer && images.length > 0 && !selectedImage) {
      handleImageSelect(images[0]);
    }
  }, [viewer, images, selectedImage, handleImageSelect]);

  const handleImageSelect = React.useCallback((image) => {
    console.log('Handling image select:', image);
    setSelectedImage(image);
    if (viewer) {
      console.log('Viewer exists, attempting to open image');
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
    } else {
      console.log('Viewer not initialized yet');
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
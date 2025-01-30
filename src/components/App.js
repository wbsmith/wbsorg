// src/components/App.js
import React from 'react';
import OpenSeadragon from 'openseadragon';
import Filmstrip from './Filmstrip';

const App = () => {
  const [images, setImages] = React.useState([]);
  const [selectedImage, setSelectedImage] = React.useState(null);
  const [viewer, setViewer] = React.useState(null);
  const viewerRef = React.useRef(null);

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
              return {
                id: key.split('/').pop(),
                url: `${bucketUrl}/${key}`,
                title: key.split('/').pop(),
                thumbnail: `${bucketUrl}/${key}`,
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
      }
    };

    fetchImages();

    // Initialize OpenSeadragon
    const viewer = OpenSeadragon({
      id: 'openseadragon-viewer',
      prefixUrl: 'https://cdn.jsdelivr.net/npm/openseadragon@3.1/build/openseadragon/images/',
      animationTime: 0.5,
      blendTime: 0.1,
      constrainDuringPan: true,
      maxZoomPixelRatio: 2,
      minZoomLevel: 0.5,
      maxZoomLevel: 10,
      visibilityRatio: 1,
      gestureSettingsMouse: {
        scrollToZoom: true,
        clickToZoom: true,
        dblClickToZoom: true,
        pinchToZoom: true
      }
    });

    setViewer(viewer);

    return () => {
      viewer.destroy();
    };
  }, []);

  const handleImageSelect = (image) => {
    setSelectedImage(image);
    if (viewer) {
      viewer.open({
        type: 'image',
        url: image.url,
        buildPyramid: false
      });
    }
  };

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
            ref={viewerRef}
          />
        </div>
        
        <Filmstrip
          images={images}
          selectedImage={selectedImage}
          onImageSelect={handleImageSelect}
        />
      </main>
    </div>
  );
};

export default App;
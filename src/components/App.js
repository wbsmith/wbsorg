import React from 'react';
import OpenSeadragon from 'openseadragon';
import Filmstrip from './Filmstrip';

const App = () => {
  const [images, setImages] = React.useState([]);
  const [selectedImage, setSelectedImage] = React.useState(null);
  const [viewer, setViewer] = React.useState(null);
  const [isZoomMode, setIsZoomMode] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const viewerRef = React.useRef(null);

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
              const filename = key.split('/').pop();
              return {
                id: filename,
                url: `${bucketUrl}/${encodeURIComponent(key)}`,
                title: filename,
                thumbnail: `${bucketUrl}/thumbnails/${encodeURIComponent(filename)}`,
                lastModified: new Date(item.getElementsByTagName("LastModified")[0].textContent)
              };
            }
            return null;
          })
          .filter(item => item !== null)
          .sort((a, b) => b.lastModified - a.lastModified);

        setImages(imageList);
        if (imageList.length > 0) {
          setSelectedImage(imageList[0]);
        }
      } catch (error) {
        console.error('Error fetching images:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  }, []);

  const initializeViewer = React.useCallback(() => {
    if (!viewer && selectedImage) {
      const newViewer = OpenSeadragon({
        id: 'openseadragon-viewer',
        prefixUrl: 'https://cdn.jsdelivr.net/npm/openseadragon@3.1/build/openseadragon/images/',
        crossOriginPolicy: 'Anonymous',
        loadTilesWithAjax: true,
        showNavigator: false,
        immediateRender: true,
        maxZoomPixelRatio: 1,
        minZoomLevel: 0.5,
        maxZoomLevel: 5,
        gestureSettingsMouse: {
          scrollToZoom: true,
          dblClickToZoom: false
        }
      });

      newViewer.addHandler('open', () => {
        setIsLoading(false);
      });

      setViewer(newViewer);
      return newViewer;
    }
    return viewer;
  }, [viewer, selectedImage]);

  const handleImageSelect = React.useCallback((image) => {
    setSelectedImage(image);
    setIsZoomMode(false);
    if (viewer) {
      viewer.close();
    }
  }, [viewer]);

  const handleImageClick = React.useCallback(() => {
    if (!isZoomMode && selectedImage) {
      setIsZoomMode(true);
      setIsLoading(true);
      const currentViewer = initializeViewer();
      if (currentViewer) {
        currentViewer.open({
          type: 'image',
          url: selectedImage.url,
          crossOriginPolicy: 'Anonymous',
          success: () => setIsLoading(false)
        });
      }
    }
  }, [isZoomMode, selectedImage, initializeViewer]);

  return (
    <div className="app-container">
      <header>
        <h1>Photo Gallery</h1>
      </header>
      
      <main>
        <div className="viewer-section">
          {selectedImage && (
            <div 
              className="viewer-container"
              id="openseadragon-viewer"
              ref={viewerRef}
              onDoubleClick={handleImageClick}
            >
              {!isZoomMode && (
                <img
                  src={selectedImage.url}
                  alt={selectedImage.title}
                  className="main-image"
                  crossOrigin="anonymous"
                />
              )}
              {isLoading && <div className="loading">Loading...</div>}
            </div>
          )}
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
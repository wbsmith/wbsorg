// App.js
import React from 'react';
import OpenSeadragon from 'openseadragon';
import EXIF from 'exif-js';
import Filmstrip from './Filmstrip';

const App = () => {
  const [images, setImages] = React.useState([]);
  const [selectedImage, setSelectedImage] = React.useState(null);
  const [viewer, setViewer] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [viewerError, setViewerError] = React.useState(false);

  const handleImageSelect = React.useCallback((image) => {
    if (!viewer || viewerError) return;

    try {
      console.log('Loading image:', image.url);
      setSelectedImage(image);
      viewer.open({
        type: 'image',
        url: image.url,
        success: () => {
          console.log('Successfully loaded image:', image.title);
        },
        error: (err) => {
          console.error('Failed to load image:', err);
          setViewerError(true);
        }
      });
    } catch (error) {
      console.error('Error in handleImageSelect:', error);
      setViewerError(true);
    }
  }, [viewer, viewerError]);

  React.useEffect(() => {
    let mounted = true;
    let viewerInstance = null;

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
          
          try {
            viewerInstance = new OpenSeadragon({
              id: 'openseadragon-viewer',
              prefixUrl: 'https://cdn.jsdelivr.net/npm/openseadragon@3.1/build/openseadragon/images/',
              showNavigationControl: true,
              defaultZoomLevel: 0,
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

            viewerInstance.addHandler('open', () => {
              console.log('Viewer opened successfully');
            });

            viewerInstance.addHandler('error', () => {
              console.error('Viewer encountered an error');
              setViewerError(true);
            });

            setViewer(viewerInstance);

            // Load the first image after a short delay
            if (imageList.length > 0) {
              setTimeout(() => {
                handleImageSelect(imageList[0]);
              }, 500);
            }

          } catch (error) {
            console.error('Error initializing OpenSeadragon:', error);
            setViewerError(true);
          }
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
      if (viewerInstance) {
        try {
          viewerInstance.destroy();
        } catch (error) {
          console.error('Error destroying viewer:', error);
        }
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
          {viewerError ? (
            <div className="viewer-error">
              Error loading viewer. Please refresh the page.
            </div>
          ) : (
            <div 
              id="openseadragon-viewer" 
              className="viewer-container"
            />
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
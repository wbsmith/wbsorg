import React from 'react';
import OpenSeadragon from 'openseadragon';
import Filmstrip from './Filmstrip';

const App = () => {
  const [images, setImages] = React.useState([]);
  const [selectedImage, setSelectedImage] = React.useState(null);
  const [viewer, setViewer] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [viewerError, setViewerError] = React.useState(false);

  const handleImageSelect = React.useCallback((image) => {
    if (!viewer || viewerError) return;  // Don't try if viewer isn't ready or had error

    try {
      setSelectedImage(image);
      viewer.open({
        type: 'image',
        url: image.url,
        crossOriginPolicy: 'Anonymous',
        buildPyramid: false,
        immediateRender: true,
        success: () => {
          console.log('Image loaded successfully:', image.title);
        },
        error: (error) => {
          console.error('Failed to load image:', error);
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
          
          // Initialize OpenSeadragon with error handling
          try {
            viewerInstance = OpenSeadragon({
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
              debugMode: false,
              showNavigator: false,
              useCanvas: true,
              preserveImageSizeOnResize: true,
              defaultZoomLevel: 0,
              minPixelRatio: 0.5,
              seamlessMode: false,
              placeholderFillStyle: 'black',
              wrapHorizontal: false,
              wrapVertical: false,
              drawer: {
                type: 'canvas',
                useWebGL: false
              }
            });

            // Add error handlers
            viewerInstance.addHandler('open-failed', () => {
              console.error('Failed to open viewer');
              setViewerError(true);
            });

            viewerInstance.addHandler('ready', () => {
              if (mounted) {
                setViewer(viewerInstance);
                // Only try to load first image if everything is working
                if (imageList.length > 0 && !viewerError) {
                  setTimeout(() => handleImageSelect(imageList[0]), 100);
                }
              }
            });

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
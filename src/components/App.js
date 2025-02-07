import React from 'react';
import OpenSeadragon from 'openseadragon';
import Filmstrip from './Filmstrip';

const App = () => {
  const [images, setImages] = React.useState([]);
  const [selectedImage, setSelectedImage] = React.useState(null);
  const [viewer, setViewer] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null); // For error handling

  React.useEffect(() => {
    const fetchImages = async () => {
      try {
        const bucketUrl = 'https://s3.us-west-1.amazonaws.com/wbryansmith.org';
        const response = await fetch(`${bucketUrl}?list-type=2&prefix=full_imgs/`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
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
        setError(null); // Clear any previous errors
      } catch (err) {
        console.error('Error fetching images:', err);
        setError("Error loading images. Please try again later."); // Set error message
      } finally {
        setIsLoading(false);
      }
    };

    const initializeViewer = async () => {
      try {
        await fetchImages(); // Wait for images to load

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
          immediateRender: true, // Experiment with this setting
          gestureSettingsMouse: {
            scrollToZoom: true,
            clickToZoom: false,
            dblClickToZoom: true,
            pinchToZoom: true
          }
        });

        viewer.addHandler('open', () => {
          console.log('Viewer is ready and image is loaded (inside OSD init useEffect)');
        });

        setViewer(viewer);

        if (images.length > 0) {
          handleImageSelect(images[0]);
        }
      } catch (error) {
        console.error("Error initializing viewer:", error);
        setError("Error initializing viewer. Please try again later.");
      }
    };

    initializeViewer();

    return () => {
      if (viewer) {
        viewer.destroy();
      }
    };
  }, []);

  const handleImageSelect = React.useCallback((image) => {
    console.log('handleImageSelect called with:', image); // Log the image object
    console.log('Viewer state:', viewer); // Log the viewer object
    console.log('Viewer open state:', viewer && viewer.isOpen()); // Log if viewer is open
    console.log('Handling image select:', image);
    setSelectedImage(image);
    if (viewer && viewer.isOpen()) { // Check if viewer is initialized and open
      console.log('Viewer exists, attempting to open image');
      viewer.open({
        type: 'image',
        url: image.url,
        crossOriginPolicy: 'Anonymous',
        buildPyramid: false, // Or true if you want deep zoom
        immediateRender: true, // Experiment with this setting
        success: () => {
          console.log('Image loaded successfully');
        },
        error: (err) => {
          console.error('Error loading image:', err);
          setError("Error loading image. Please try again later."); // Set error message
        }
      });
    } else {
      console.log('Viewer not initialized yet or not open.');
    }
  }, [viewer]);

  React.useEffect(() => {
    if (viewer && images.length > 0 && !selectedImage) {
      console.log("useEffect running - attempting initial image load"); // Add this log
      handleImageSelect(images[0]);
    }
  }, [viewer, images, selectedImage]);

  return (
    <div className="app-container">
      <header>
        <h1>Photo Gallery</h1>
      </header>

      <main>
        {isLoading && <div>Loading images...</div>}
        {error && <div className="error-message">{error}</div>} {/* Display error */}
        {!isLoading && !error && ( // Only render if not loading and no errors
          <div className="viewer-section">
            <div id="openseadragon-viewer" className="viewer-container" />
          </div>
        )}
        {!isLoading && !error && <Filmstrip images={images} selectedImage={selectedImage} onImageSelect={handleImageSelect} />}
      </main>
    </div>
  );
};

export default App;
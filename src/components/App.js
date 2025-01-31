import React from 'react';
import OpenSeadragon from 'openseadragon';
import Filmstrip from './Filmstrip';

const App = () => {
  const [images, setImages] = React.useState([]);
  const [selectedImage, setSelectedImage] = React.useState(null);
  const [viewer, setViewer] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [viewerError, setViewerError] = React.useState(false);
  const [imageAspectRatio, setImageAspectRatio] = React.useState(4/3); // default ratio

  const updateViewportSize = (imageUrl) => {
    const img = new Image();
    img.onload = () => {
      const ratio = img.width / img.height;
      setImageAspectRatio(ratio);
    };
    img.src = imageUrl;
  };

  const handleImageSelect = React.useCallback((image) => {
    if (!viewer || viewerError) return;

    try {
      setSelectedImage(image);
      updateViewportSize(image.url);
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

  // Rest of your existing useEffect and other code remains the same...

  // Calculate viewport height based on available width and aspect ratio
  const calculateViewportStyle = () => {
    const viewportWidth = document.querySelector('.viewer-section')?.clientWidth || window.innerWidth;
    const viewportHeight = viewportWidth / imageAspectRatio;
    
    // Optional: Set maximum height to prevent extremely tall/short viewports
    const maxHeight = window.innerHeight * 0.7; // 70% of window height
    const minHeight = window.innerHeight * 0.3; // 30% of window height
    
    return {
      height: Math.min(Math.max(viewportHeight, minHeight), maxHeight),
      width: '100%',
      border: '1px solid rgb(75, 122, 255)',
      backgroundColor: 'black'
    };
  };

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
              style={calculateViewportStyle()}
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
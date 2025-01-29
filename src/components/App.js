import React from 'react';
import { CloverIIIF } from '@samvera/clover-iiif';
import Filmstrip from './components/Filmstrip';

const App = () => {
  const [images, setImages] = React.useState([]);
  const [selectedImage, setSelectedImage] = React.useState(null);
  const [currentManifest, setCurrentManifest] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const response = await fetch('/images');
      const data = await response.json();
      const imagesWithThumbnails = data.map(img => ({
        ...img,
        thumbnail: `/thumbnail/${img.id}`,
        title: img.id
      }));
      setImages(imagesWithThumbnails);
      
      if (imagesWithThumbnails.length > 0 && !selectedImage) {
        handleImageSelect(imagesWithThumbnails[0].id);
      }
    } catch (error) {
      console.error('Error fetching images:', error);
    }
  };

  const handleImageSelect = async (imageId) => {
    try {
      setLoading(true);
      setSelectedImage(imageId);
      const response = await fetch(`/manifest/${imageId}`);
      const manifest = await response.json();
      setCurrentManifest(manifest);
    } catch (error) {
      console.error('Error loading manifest:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>Photo Gallery</h1>
      </header>
      
      <main>
        <div className="viewer-section">
          {loading ? (
            <div className="loading">Loading...</div>
          ) : currentManifest ? (
            <div className="viewer-container">
              <CloverIIIF
                manifest={currentManifest}
                options={{
                  canvasHeight: '60vh',
                  showIIIFBadge: false,
                  showTitle: false,
                }}
              />
            </div>
          ) : (
            <div className="no-image-selected">
              <p>No image selected</p>
            </div>
          )}
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
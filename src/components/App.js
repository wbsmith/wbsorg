// src/components/App.js
import React from 'react';
import CloverIIIF from '@samvera/clover-iiif';
import { Storage } from 'aws-amplify';
import Filmstrip from './Filmstrip';

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
      const s3Objects = await Storage.list('full_imgs/');
      
      const imageFiles = s3Objects
        .filter(item => {
          const isImage = /\.(jpg|jpeg|png|gif)$/i.test(item.key);
          const isNotDirectory = !item.key.endsWith('/');
          return isImage && isNotDirectory;
        })
        .map(async (item) => {
          const url = await Storage.get(item.key);
          return {
            id: item.key.split('/').pop(),
            fullPath: url,
            thumbnail: url, // Using full image as thumbnail for now
            title: item.key.split('/').pop(),
            lastModified: item.lastModified
          };
        });

      const resolvedImages = await Promise.all(imageFiles);
      const sortedImages = resolvedImages.sort((a, b) => 
        b.lastModified - a.lastModified
      );

      setImages(sortedImages);
      
      if (sortedImages.length > 0) {
        handleImageSelect(sortedImages[0].id);
      }
    } catch (error) {
      console.error('Error fetching images:', error);
    }
  };

  const handleImageSelect = async (imageId) => {
    try {
      setLoading(true);
      setSelectedImage(imageId);
      
      const selectedImage = images.find(img => img.id === imageId);
      if (!selectedImage) {
        throw new Error('Image not found');
      }

      const manifest = {
        "@context": "http://iiif.io/api/presentation/3/context.json",
        "id": `https://www.wbryansmith.org/manifest/${imageId}`,
        "type": "Manifest",
        "label": { "en": [selectedImage.title] },
        "items": [
          {
            "id": `https://www.wbryansmith.org/canvas/${imageId}`,
            "type": "Canvas",
            "height": 3000,
            "width": 4000,
            "items": [
              {
                "id": `https://www.wbryansmith.org/annotation-page/${imageId}`,
                "type": "AnnotationPage",
                "items": [
                  {
                    "id": `https://www.wbryansmith.org/annotation/${imageId}`,
                    "type": "Annotation",
                    "motivation": "painting",
                    "body": {
                      "id": selectedImage.fullPath,
                      "type": "Image",
                      "format": "image/jpeg",
                      "service": [
                        {
                          "@id": selectedImage.fullPath,
                          "type": "ImageService3",
                          "profile": "level2"
                        }
                      ]
                    },
                    "target": `https://www.wbryansmith.org/canvas/${imageId}`
                  }
                ]
              }
            ]
          }
        ]
      };
      
      setCurrentManifest(manifest);
    } catch (error) {
      console.error('Error setting manifest:', error);
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
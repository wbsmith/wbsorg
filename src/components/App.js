// src/components/App.js
import React from 'react';
import CloverIIIF from '@samvera/clover-iiif';
import { Storage } from 'aws-amplify';
import Filmstrip from './Filmstrip';

const BUCKET_URL = 'https://s3.us-west-1.amazonaws.com/wbryansmith.org';

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
      const s3Objects = await Storage.list('full_imgs/', { 
        pageSize: 1000,
        level: 'public'
      });
      
      const imageFiles = s3Objects
        .filter(item => {
          const isImage = /\.(jpg|jpeg|png|gif)$/i.test(item.key);
          const isNotDirectory = !item.key.endsWith('/');
          return isImage && isNotDirectory;
        })
        .map(item => ({
          id: item.key.split('/').pop(),
          fullPath: `${BUCKET_URL}/${item.key}`,
          thumbnail: `${BUCKET_URL}/${item.key}`,
          title: item.key.split('/').pop(),
          lastModified: item.lastModified
        }));

      setImages(imageFiles);
      
      if (imageFiles.length > 0) {
        handleImageSelect(imageFiles[0].id);
      }
    } catch (error) {
      console.error('Error fetching images:', error);
      // Fallback to hardcoded list for testing
      const fallbackImages = [
        'WBS_001459_20250107_172322.jpg',
        'WBS_001573_20250107_174056.jpg',
        'WBS_001580_20250107_174426.jpg',
        'WBS_001581_20250107_174608.jpg',
        'WBS_001584_20250107_174906.jpg'
      ].map(filename => ({
        id: filename,
        fullPath: `${BUCKET_URL}/full_imgs/${filename}`,
        thumbnail: `${BUCKET_URL}/full_imgs/${filename}`,
        title: filename,
        lastModified: new Date()
      }));
      
      setImages(fallbackImages);
      if (fallbackImages.length > 0) {
        handleImageSelect(fallbackImages[0].id);
      }
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
        "@context": ["http://iiif.io/api/presentation/3/context.json"],
        "id": `https://www.wbryansmith.org/manifest/${imageId}`,
        "type": "Manifest",
        "label": { "en": [selectedImage.title] },
        "rights": "http://creativecommons.org/licenses/by/4.0/",
        "rendering": [
          {
            "id": selectedImage.fullPath,
            "type": "Image",
            "label": { "en": ["Download as JPG"] },
            "format": "image/jpeg"
          }
        ],
        "items": [
          {
            "id": `https://www.wbryansmith.org/canvas/${imageId}`,
            "type": "Canvas",
            "width": 4000,
            "height": 3000,
            "items": [
              {
                "id": `https://www.wbryansmith.org/page/${imageId}`,
                "type": "AnnotationPage",
                "items": [
                  {
                    "id": `https://www.wbryansmith.org/annotation/${imageId}`,
                    "type": "Annotation",
                    "motivation": "painting",
                    "target": `https://www.wbryansmith.org/canvas/${imageId}`,
                    "body": {
                      "id": selectedImage.fullPath,
                      "type": "Image",
                      "format": "image/jpeg",
                      "width": 4000,
                      "height": 3000,
                      "service": [
                        {
                          "id": selectedImage.fullPath.split('.')[0],
                          "profile": "level0",
                          "type": "ImageService3"
                        }
                      ]
                    }
                  }
                ]
              }
            ]
          }
        ]
      };
      
      console.log('About to set manifest:', manifest);
      setCurrentManifest(manifest);
    } catch (error) {
      console.error('Error setting manifest:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloverError = (error) => {
    console.error('CloverIIIF Error:', error);
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
              {console.log('Current Manifest:', currentManifest)}
              <CloverIIIF
                manifest={currentManifest}
                options={{
                  canvasHeight: '60vh',
                  showIIIFBadge: false,
                  showTitle: false
                }}
                onError={handleCloverError}
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
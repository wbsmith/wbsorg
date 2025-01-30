// src/components/App.js
import React from 'react';
import CloverIIIF from '@samvera/clover-iiif';
import Filmstrip from './Filmstrip';

const App = () => {
  const [images, setImages] = React.useState([]);
  const [selectedImage, setSelectedImage] = React.useState(null);
  const [currentManifest, setCurrentManifest] = React.useState(null);

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
  }, []);

  const handleImageSelect = (image) => {
    setSelectedImage(image);
    
    const manifest = {
      "@context": "http://iiif.io/api/presentation/3/context.json",
      "id": "https://example.org/manifest.json",
      "type": "Manifest",
      "label": {
        "en": [
          image.title
        ]
      },
      "items": [
        {
          "id": "https://example.org/canvas/p1",
          "type": "Canvas",
          "height": 3000,
          "width": 4000,
          "items": [
            {
              "id": "https://example.org/page/p1/1",
              "type": "AnnotationPage",
              "items": [
                {
                  "id": "https://example.org/annotation/p0001-image",
                  "type": "Annotation",
                  "motivation": "painting",
                  "body": {
                    "id": image.url,    // This is our actual S3 image URL
                    "type": "Image",
                    "format": "image/jpeg",
                    "height": 3000,
                    "width": 4000
                  },
                  "target": "https://example.org/canvas/p1"
                }
              ]
            }
          ]
        }
      ]
    };
    
    console.log('Setting manifest:', manifest);
    setCurrentManifest(manifest);
  };

  return (
    <div className="app-container">
      <header>
        <h1>Photo Gallery</h1>
      </header>
      
      <main>
        <div className="viewer-section">
          {currentManifest ? (
            <div className="viewer-container">
              <CloverIIIF
                manifest={currentManifest}
                options={{
                  canvasHeight: '60vh',
                  showIIIFBadge: false,
                  showTitle: false,
                  showImageCaption: false
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
// src/components/App.js
import React from 'react';
import Panzoom from '@panzoom/panzoom';
import Filmstrip from './Filmstrip';

const App = () => {
  const [images, setImages] = React.useState([]);
  const [selectedImage, setSelectedImage] = React.useState(null);
  const imageRef = React.useRef(null);
  const panzoomRef = React.useRef(null);

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
              const baseUrl = `${bucketUrl}/${key}`;
              return {
                id: key.split('/').pop(),
                url: baseUrl,
                title: key.split('/').pop(),
                // Add size parameters for thumbnails if your S3 setup supports it
                thumbnail: `${baseUrl}?width=200`,  // Adjust if your S3 config supports image resizing
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

  React.useEffect(() => {
    if (imageRef.current) {
      if (panzoomRef.current) {
        panzoomRef.current.destroy();
      }

      panzoomRef.current = Panzoom(imageRef.current, {
        maxScale: 5,
        minScale: 0.5,
        contain: 'outside',
        step: 0.1,          // Smaller steps for smoother zoom
        smooth: true        // Enable smooth transformations
      });

      // Improved wheel handling
      imageRef.current.parentElement.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY;
        const scale = delta > 0 ? 0.9 : 1.1;  // Smoother scale factor
        panzoomRef.current.zoom(scale, {
          animate: true,
          focal: { x: e.clientX, y: e.clientY }
        });
      }, { passive: false });
    }

    return () => {
      if (panzoomRef.current) {
        panzoomRef.current.destroy();
      }
    };
  }, [selectedImage]);

  const handleImageSelect = (image) => {
    setSelectedImage(image);
  };

  return (
    <div className="app-container">
      <header>
        <h1>Photo Gallery</h1>
      </header>
      
      <main>
        <div className="viewer-section">
          {selectedImage ? (
            <div className="viewer-container">
              <img 
                ref={imageRef}
                src={selectedImage.url} 
                alt={selectedImage.title}
                onLoad={(e) => {
                  // Center the image after it loads
                  if (panzoomRef.current) {
                    panzoomRef.current.reset();
                  }
                }}
                className="main-image"
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
// src/components/App.js
import React from 'react';

const App = () => {
  const [images, setImages] = React.useState([]);
  const [selectedImage, setSelectedImage] = React.useState(null);

  React.useEffect(() => {
    const fetchImages = async () => {
      try {
        // Using XMLHttpRequest to list bucket contents
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
                timestamp: key.split('_')[2].split('.')[0]
              };
            }
            return null;
          })
          .filter(item => item !== null)
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

        setImages(imageList);
        if (imageList.length > 0) {
          setSelectedImage(imageList[0]);
        }
      } catch (error) {
        console.error('Error fetching images:', error);
      }
    };

    fetchImages();
  }, []);

  return (
    <div style={{ backgroundColor: 'black', color: 'rgb(75, 122, 255)', minHeight: '100vh', padding: '20px' }}>
      <h1>Image Gallery</h1>
      
      {/* Main image display */}
      {selectedImage && (
        <div style={{ marginBottom: '20px' }}>
          <img 
            src={selectedImage.url} 
            alt={selectedImage.id}
            style={{ 
              width: '1024px', 
              height: 'auto',
              maxWidth: '100%',
              display: 'block',
              margin: '0 auto'
            }}
          />
        </div>
      )}

      {/* Image list */}
      <div>
        <h2>All Images:</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {images.map(image => (
            <li 
              key={image.id} 
              style={{ marginBottom: '10px', cursor: 'pointer' }}
              onClick={() => setSelectedImage(image)}
            >
              {image.id}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default App;


// // src/components/App.js
// import React from 'react';

// const App = () => {
//   const [images, setImages] = React.useState([]);
//   const [selectedImage, setSelectedImage] = React.useState(null);

//   React.useEffect(() => {
//     // For now, using known images to test the display
//     const bucketPath = 'https://s3.us-west-1.amazonaws.com/wbryansmith.org/full_imgs';
//     const knownImages = [
//       'WBS_001459_20250107_172322.jpg',
//       'WBS_001573_20250107_174056.jpg',
//       'WBS_001580_20250107_174426.jpg',
//       'WBS_001581_20250107_174608.jpg',
//       'WBS_001584_20250107_174906.jpg'
//     ];

//     const imageObjects = knownImages.map(filename => ({
//       id: filename,
//       url: `${bucketPath}/${filename}`,
//       timestamp: filename.split('_')[2].split('.')[0] // Extract date from filename
//     }));

//     // Sort by timestamp (most recent first)
//     const sortedImages = imageObjects.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
//     setImages(sortedImages);
//     setSelectedImage(sortedImages[0]);
//   }, []);

//   return (
//     <div style={{ backgroundColor: 'black', color: 'rgb(75, 122, 255)', minHeight: '100vh', padding: '20px' }}>
//       <h1>Image Gallery</h1>
      
//       {/* Main image display */}
//       {selectedImage && (
//         <div style={{ marginBottom: '20px' }}>
//           <img 
//             src={selectedImage.url} 
//             alt={selectedImage.id}
//             style={{ 
//               width: '1024px', 
//               height: 'auto',
//               maxWidth: '100%',
//               display: 'block',
//               margin: '0 auto'
//             }}
//           />
//         </div>
//       )}

//       {/* Image list */}
//       <div>
//         <h2>All Images:</h2>
//         <ul style={{ listStyle: 'none', padding: 0 }}>
//           {images.map(image => (
//             <li 
//               key={image.id} 
//               style={{ marginBottom: '10px', cursor: 'pointer' }}
//               onClick={() => setSelectedImage(image)}
//             >
//               {image.id}
//             </li>
//           ))}
//         </ul>
//       </div>
//     </div>
//   );
// };

// export default App;



// // // src/components/App.js
// // import React from 'react';
// // import CloverIIIF from '@samvera/clover-iiif';
// // import Filmstrip from './Filmstrip';

// // const BUCKET_URL = 'https://s3.us-west-1.amazonaws.com/wbryansmith.org';

// // const App = () => {
// //   const [images, setImages] = React.useState([]);
// //   const [selectedImage, setSelectedImage] = React.useState(null);
// //   const [currentManifest, setCurrentManifest] = React.useState(null);
// //   const [loading, setLoading] = React.useState(false);

// //   const initializeGallery = () => {
// //     const imageFiles = [
// //       'WBS_001459_20250107_172322.jpg',
// //       'WBS_001573_20250107_174056.jpg',
// //       'WBS_001580_20250107_174426.jpg',
// //       'WBS_001581_20250107_174608.jpg',
// //       'WBS_001584_20250107_174906.jpg'
// //     ].map(filename => ({
// //       id: filename,
// //       fullPath: `${BUCKET_URL}/full_imgs/${filename}`,
// //       thumbnail: `${BUCKET_URL}/full_imgs/${filename}`,
// //       title: filename,
// //       lastModified: new Date()
// //     }));
    
// //     setImages(imageFiles);
// //     // Instead of calling handleImageSelect, create the manifest directly
// //     if (imageFiles.length > 0) {
// //       const firstImage = imageFiles[0];
// //       setSelectedImage(firstImage.id);
      
// //       const initialManifest = {
// //         "@context": ["http://iiif.io/api/presentation/3/context.json"],
// //         "id": `https://www.wbryansmith.org/manifest/${firstImage.id}`,
// //         "type": "Manifest",
// //         "label": { "en": [firstImage.title] },
// //         "items": [
// //           {
// //             "id": `https://www.wbryansmith.org/canvas/${firstImage.id}`,
// //             "type": "Canvas",
// //             "width": 4000,
// //             "height": 3000,
// //             "items": [
// //               {
// //                 "id": `https://www.wbryansmith.org/page/${firstImage.id}`,
// //                 "type": "AnnotationPage",
// //                 "items": [
// //                   {
// //                     "id": `https://www.wbryansmith.org/annotation/${firstImage.id}`,
// //                     "type": "Annotation",
// //                     "motivation": "painting",
// //                     "target": `https://www.wbryansmith.org/canvas/${firstImage.id}`,
// //                     "body": {
// //                       "id": firstImage.fullPath,
// //                       "type": "Image",
// //                       "format": "image/jpeg",
// //                       "width": 4000,
// //                       "height": 3000
// //                     }
// //                   }
// //                 ]
// //               }
// //             ]
// //           }
// //         ]
// //       };
      
// //       setCurrentManifest(initialManifest);
// //     }
// //   };

// //   React.useEffect(() => {
// //     initializeGallery();
// //   }, []);

// //   const handleImageSelect = async (imageId) => {
// //     try {
// //       setLoading(true);
// //       setSelectedImage(imageId);
      
// //       const selectedImage = images.find(img => img.id === imageId);
// //       if (!selectedImage) {
// //         throw new Error('Image not found');
// //       }

// //       const manifest = {
// //         "@context": ["http://iiif.io/api/presentation/3/context.json"],
// //         "id": `https://www.wbryansmith.org/manifest/${imageId}`,
// //         "type": "Manifest",
// //         "label": { "en": [selectedImage.title] },
// //         "items": [
// //           {
// //             "id": `https://www.wbryansmith.org/canvas/${imageId}`,
// //             "type": "Canvas",
// //             "width": 4000,
// //             "height": 3000,
// //             "items": [
// //               {
// //                 "id": `https://www.wbryansmith.org/page/${imageId}`,
// //                 "type": "AnnotationPage",
// //                 "items": [
// //                   {
// //                     "id": `https://www.wbryansmith.org/annotation/${imageId}`,
// //                     "type": "Annotation",
// //                     "motivation": "painting",
// //                     "target": `https://www.wbryansmith.org/canvas/${imageId}`,
// //                     "body": {
// //                       "id": selectedImage.fullPath,
// //                       "type": "Image",
// //                       "format": "image/jpeg",
// //                       "width": 4000,
// //                       "height": 3000
// //                     }
// //                   }
// //                 ]
// //               }
// //             ]
// //           }
// //         ]
// //       };
      
// //       setCurrentManifest(manifest);
// //     } catch (error) {
// //       console.error('Error setting manifest:', error);
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   const handleCloverError = (error) => {
// //     console.error('CloverIIIF Error:', error);
// //   };

// //   return (
// //     <div className="app-container">
// //       <header>
// //         <h1>Photo Gallery</h1>
// //       </header>
      
// //       <main>
// //         <div className="viewer-section">
// //           {loading ? (
// //             <div className="loading">Loading...</div>
// //           ) : currentManifest ? (
// //             <div className="viewer-container">
// //               <CloverIIIF
// //                 manifest={currentManifest}
// //                 options={{
// //                   canvasHeight: '60vh',
// //                   showIIIFBadge: false,
// //                   showTitle: false
// //                 }}
// //                 onError={handleCloverError}
// //               />
// //             </div>
// //           ) : (
// //             <div className="no-image-selected">
// //               <p>No image selected</p>
// //             </div>
// //           )}
// //         </div>
        
// //         <Filmstrip
// //           images={images}
// //           selectedImage={selectedImage}
// //           onImageSelect={handleImageSelect}
// //         />
// //       </main>
// //     </div>
// //   );
// // };

// // export default App;
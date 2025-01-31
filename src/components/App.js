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

 const getImageCreationDate = async (url) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = function() {
      EXIF.getData(img, function() {
        const dateTimeOriginal = EXIF.getTag(this, "DateTimeOriginal");
        if (dateTimeOriginal) {
          try {
            const timestamp = new Date(dateTimeOriginal);
            if (isNaN(timestamp)) {
              resolve(new Date(0));
            } else {
              resolve(timestamp);
            }
          } catch (error) {
            console.error('Error parsing EXIF date:', error);
            resolve(new Date(0));
          }
        } else {
          resolve(new Date(0));
        }
      });
    };
    img.onerror = function() {
      console.error('Error loading image for EXIF data:', url);
      resolve(new Date(0));
    };
    img.src = url;
  });
};

 React.useEffect(() => {
   const fetchImages = async () => {
     try {
       const bucketUrl = 'https://s3.us-west-1.amazonaws.com/wbryansmith.org';
       const response = await fetch(`${bucketUrl}?list-type=2&prefix=full_imgs/`);
       const data = await response.text();
       const parser = new DOMParser();
       const xmlDoc = parser.parseFromString(data, "text/xml");
       const contents = xmlDoc.getElementsByTagName("Contents");
       
       // First, create basic image objects
       const unsortedImages = Array.from(contents)
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
         .filter(item => item !== null);

       // Then get EXIF data for each image
       const imagesWithDates = await Promise.all(
         unsortedImages.map(async (image) => {
           try {
             const createdDate = await getImageCreationDate(image.url);
             return { ...image, created: createdDate };
           } catch (error) {
             console.error('Error getting EXIF data for:', image.url);
             return { ...image, created: new Date(0) };
           }
         })
       );

       // Sort by creation date
       const imageList = imagesWithDates.sort((a, b) => b.created - a.created);

       setImages(imageList);
       if (imageList.length > 0) {
         handleImageSelect(imageList[0]);
       }
     } catch (error) {
       console.error('Error fetching images:', error);
     } finally {
       setIsLoading(false);
     }
   };

   fetchImages();

   // Initialize OpenSeadragon
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
     immediateRender: true,
     gestureSettingsMouse: {
       scrollToZoom: true,
       clickToZoom: false,
       dblClickToZoom: true,
       pinchToZoom: true
     }
   });

   setViewer(viewer);

   return () => {
     viewer.destroy();
   };
 }, []);

 const handleImageSelect = React.useCallback((image) => {
   setSelectedImage(image);
   if (viewer) {
     viewer.open({
       type: 'image',
       url: image.url,
       crossOriginPolicy: 'Anonymous',
       buildPyramid: false,
       immediateRender: true
     });
   }
 }, [viewer]);

 return (
   <div className="app-container">
     <header>
       <h1>Photo Gallery</h1>
     </header>
     
     <main>
       <div className="viewer-section">
         <div 
           id="openseadragon-viewer" 
           className="viewer-container"
         />
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
const express = require('express');
const path = require('path');
const AWS = require('./config/aws');
const sharp = require('sharp');

const app = express();
const s3 = new AWS.S3();

app.use(express.static('dist'));

async function listS3Images() {
  const params = {
    Bucket: 'wbryansmith.org',
    Prefix: 'full_imgs/',
    MaxKeys: 1000
  };
  
  try {
    const data = await s3.listObjectsV2(params).promise();
    return data.Contents
      .filter(item => {
        const isImage = /\.(jpg|jpeg|png|gif)$/i.test(item.Key);
        const isNotDirectory = !item.Key.endsWith('/');
        return isImage && isNotDirectory;
      })
      .map(item => ({
        id: path.basename(item.Key),
        fullPath: `https://s3.amazonaws.com/wbryansmith.org/${item.Key}`,
        size: item.Size,
        lastModified: item.LastModified
      }))
      .sort((a, b) => b.lastModified - a.lastModified);
  } catch (error) {
    console.error('Error listing S3 images:', error);
    return [];
  }
}

async function generateThumbnail(imageKey) {
  try {
    const params = {
      Bucket: 'wbryansmith.org',
      Key: imageKey
    };

    const imageData = await s3.getObject(params).promise();
    const thumbnail = await sharp(imageData.Body)
      .resize(120, 100, {
        fit: 'cover',
        position: 'center'
      })
      .toBuffer();

    return thumbnail;
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    throw error;
  }
}

app.get('/api/images', async (req, res) => {
  try {
    const images = await listS3Images();
    res.json(images);
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

app.get('/api/thumbnail/:imageId', async (req, res) => {
  try {
    const imageKey = `full_imgs/${req.params.imageId}`;
    const thumbnail = await generateThumbnail(imageKey);
    
    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=31536000');
    res.send(thumbnail);
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    res.status(500).json({ error: 'Failed to generate thumbnail' });
  }
});

app.get('/api/manifest/:id', (req, res) => {
  const s3ImageUrl = `https://s3.amazonaws.com/wbryansmith.org/full_imgs/${req.params.id}`;
  
  const manifest = {
    "@context": "http://iiif.io/api/presentation/3/context.json",
    "id": `https://www.wbryansmith.org/api/manifest/${req.params.id}`,
    "type": "Manifest",
    "label": { "en": ["High Resolution Photo"] },
    "items": [
      {
        "id": `https://www.wbryansmith.org/canvas/${req.params.id}`,
        "type": "Canvas",
        "height": 3000,
        "width": 4000,
        "items": [
          {
            "id": `https://www.wbryansmith.org/annotation-page/${req.params.id}`,
            "type": "AnnotationPage",
            "items": [
              {
                "id": `https://www.wbryansmith.org/annotation/${req.params.id}`,
                "type": "Annotation",
                "motivation": "painting",
                "body": {
                  "id": s3ImageUrl,
                  "type": "Image",
                  "format": "image/jpeg",
                  "service": [
                    {
                      "@id": s3ImageUrl,
                      "type": "ImageService3",
                      "profile": "level2"
                    }
                  ]
                },
                "target": `https://www.wbryansmith.org/canvas/${req.params.id}`
              }
            ]
          }
        ]
      }
    ]
  };
  
  res.json(manifest);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// const express = require('express');
// const path = require('path');
// const AWS = require('./config/aws');
// const sharp = require('sharp');

// const app = express();
// const s3 = new AWS.S3();

// app.use(express.static('public'));

// // Function to list all images in the S3 bucket
// async function listS3Images() {
//   const params = {
//     Bucket: 'wbryansmith.org',
//     Prefix: 'full_imgs/',
//     MaxKeys: 1000
//   };
  
//   try {
//     const data = await s3.listObjectsV2(params).promise();
//     return data.Contents
//       .filter(item => {
//         // Filter for image files and exclude directories
//         const isImage = /\.(jpg|jpeg|png|gif)$/i.test(item.Key);
//         const isNotDirectory = !item.Key.endsWith('/');
//         return isImage && isNotDirectory;
//       })
//       .map(item => ({
//         id: path.basename(item.Key),
//         fullPath: item.Key,
//         size: item.Size,
//         lastModified: item.LastModified
//       }))
//       .sort((a, b) => b.lastModified - a.lastModified); // Sort by date, newest first
//   } catch (error) {
//     console.error('Error listing S3 images:', error);
//     return [];
//   }
// }

// // Function to generate thumbnail from S3 image
// async function generateThumbnail(imageKey) {
//   try {
//     const params = {
//       Bucket: 'wbryansmith.org',
//       Key: imageKey
//     };

//     const imageData = await s3.getObject(params).promise();
//     const thumbnail = await sharp(imageData.Body)
//       .resize(120, 100, {
//         fit: 'cover',
//         position: 'center'
//       })
//       .toBuffer();

//     return thumbnail;
//   } catch (error) {
//     console.error('Error generating thumbnail:', error);
//     throw error;
//   }
// }

// app.get('/manifest/:id', (req, res) => {
//   const manifest = {
//     "@context": "http://iiif.io/api/presentation/3/context.json",
//     "id": `https://www.wbryansmith.org/manifest/${req.params.id}`,
//     "type": "Manifest",
//     "label": { "en": ["High Resolution Photo"] },
//     "items": [
//       {
//         "id": `https://www.wbryansmith.org/canvas/${req.params.id}`,
//         "type": "Canvas",
//         "height": 3000,
//         "width": 4000,
//         "items": [
//           {
//             "id": `https://www.wbryansmith.org/annotation-page/${req.params.id}`,
//             "type": "AnnotationPage",
//             "items": [
//               {
//                 "id": `https://www.wbryansmith.org/annotation/${req.params.id}`,
//                 "type": "Annotation",
//                 "motivation": "painting",
//                 "body": {
//                   "id": `https://wbryansmith.org.s3.amazonaws.com/full_imgs/${req.params.id}/info.json`,
//                   "type": "Image",
//                   "format": "image/jpeg",
//                   "service": [
//                     {
//                       "@id": `https://wbryansmith.org.s3.amazonaws.com/full_imgs/${req.params.id}`,
//                       "type": "ImageService3",
//                       "profile": "level2"
//                     }
//                   ]
//                 },
//                 "target": `https://www.wbryansmith.org/canvas/${req.params.id}`
//               }
//             ]
//           }
//         ]
//       }
//     ]
//   };
  
//   res.json(manifest);
// });

// // Images endpoint now uses S3 listing
// app.get('/images', async (req, res) => {
//   try {
//     const images = await listS3Images();
//     res.json(images);
//   } catch (error) {
//     console.error('Error fetching images:', error);
//     res.status(500).json({ error: 'Failed to fetch images' });
//   }
// });

// // Thumbnail endpoint
// app.get('/thumbnail/:imageId', async (req, res) => {
//   try {
//     const imageKey = `full_imgs/${req.params.imageId}`;
//     const thumbnail = await generateThumbnail(imageKey);
    
//     res.set('Content-Type', 'image/jpeg');
//     res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
//     res.send(thumbnail);
//   } catch (error) {
//     console.error('Error generating thumbnail:', error);
//     res.status(500).json({ error: 'Failed to generate thumbnail' });
//   }
// });

// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });
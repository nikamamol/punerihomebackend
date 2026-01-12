const multer = require('multer');
const path = require('path');

// Use memory storage for Cloudinary
const storage = multer.memoryStorage();

// File filter for different file types
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const allowedVideoTypes = /mp4|avi|mov|wmv|flv|webm|mkv/;
  const allowedAudioTypes = /mp3|wav|ogg|m4a|aac/;
  
  const extname = path.extname(file.originalname).toLowerCase();
  
  if (file.fieldname === 'images' || file.fieldname === 'image') {
    if (allowedImageTypes.test(extname) && file.mimetype.startsWith('image/')) {
      return cb(null, true);
    }
    return cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed!'), false);
    
  } else if (file.fieldname === 'video') {
    if (allowedVideoTypes.test(extname) && file.mimetype.startsWith('video/')) {
      return cb(null, true);
    }
    return cb(new Error('Only video files (mp4, avi, mov, wmv, flv, webm, mkv) are allowed!'), false);
    
  } else if (file.fieldname === 'audio') {
    if (allowedAudioTypes.test(extname) && file.mimetype.startsWith('audio/')) {
      return cb(null, true);
    }
    return cb(new Error('Only audio files (mp3, wav, ogg, m4a, aac) are allowed!'), false);
  }
  
  cb(null, true);
};

// Create multer instance with memory storage
const multerInstance = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB per file
    files: 22 // Maximum 22 files total
  }
});

// Specific upload configuration for properties
const propertyUpload = multerInstance.fields([
  { name: 'images', maxCount: 20 },
  { name: 'video', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]);

// Export
const upload = multerInstance;

// Attach methods
upload.array = multerInstance.array.bind(multerInstance);
upload.single = multerInstance.single.bind(multerInstance);
upload.fields = multerInstance.fields.bind(multerInstance);
upload.none = multerInstance.none.bind(multerInstance);
upload.any = multerInstance.any.bind(multerInstance);
upload.propertyUpload = propertyUpload;

module.exports = upload;
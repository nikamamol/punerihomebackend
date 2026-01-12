const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Upload file to Cloudinary with progress tracking
const uploadToCloudinary = async (file, folder = 'properties') => {
  try {
    // For memory storage (Multer)
    const uploadOptions = {
      folder: `real_estate/${folder}`,
      resource_type: 'auto', // Automatically detect image/video
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    };

    // Check if file is buffer (memory storage) or path (disk storage)
    let uploadResult;
    if (file.buffer) {
      // Memory storage - upload from buffer
      uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(file.buffer);
      });
    } else {
      // Disk storage - upload from path
      uploadResult = await cloudinary.uploader.upload(file.path, uploadOptions);
    }

    return {
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      format: uploadResult.format,
      resource_type: uploadResult.resource_type,
      width: uploadResult.width,
      height: uploadResult.height,
      bytes: uploadResult.bytes,
      duration: uploadResult.duration || null, // For videos
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
};

// Delete file from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return false;
  }
};

// Delete video from Cloudinary
const deleteVideoFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    return true;
  } catch (error) {
    console.error('Cloudinary video delete error:', error);
    return false;
  }
};

// Get optimized URL with transformations
const getOptimizedUrl = (url, options = {}) => {
  if (!url) return url;
  
  const {
    width = null,
    height = null,
    quality = 'auto',
    crop = 'fill',
    format = 'auto'
  } = options;

  if (!url.includes('cloudinary.com')) return url;

  try {
    const publicId = url.split('/').pop().split('.')[0];
    const transformation = [];
    
    if (width || height) {
      transformation.push(`c_${crop}`);
      if (width) transformation.push(`w_${width}`);
      if (height) transformation.push(`h_${height}`);
    }
    
    transformation.push(`q_${quality}`);
    transformation.push(`f_${format}`);
    
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const folder = url.split('/').slice(-2, -1)[0];
    
    return `https://res.cloudinary.com/${cloudName}/image/upload/${transformation.join(',')}/v1/${folder}/${publicId}`;
  } catch (error) {
    console.error('Error generating optimized URL:', error);
    return url;
  }
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  deleteVideoFromCloudinary,
  getOptimizedUrl
};
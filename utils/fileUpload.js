const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class FileUpload {
    // Upload file to server
    static async uploadFile(file, folder = 'general') {
        try {
            // Create directory if not exists
            const uploadDir = path.join(__dirname, '../../uploads', folder);
            await fs.mkdir(uploadDir, { recursive: true });

            // Generate unique filename
            const fileExt = path.extname(file.originalname);
            const fileName = `${uuidv4()}${fileExt}`;
            const filePath = path.join(uploadDir, fileName);

            // Save file
            await fs.writeFile(filePath, file.buffer);

            // Return file URL
            return {
                success: true,
                url: `/uploads/${folder}/${fileName}`,
                path: filePath,
                fileName: fileName
            };

        } catch (error) {
            console.error('File upload error:', error);
            throw new Error('File upload failed');
        }
    }

    // Delete file from server
    static async deleteFile(filePath) {
        try {
            // If filePath is URL, convert to filesystem path
            if (filePath.startsWith('/uploads/')) {
                filePath = path.join(__dirname, '../..', filePath);
            }

            await fs.unlink(filePath);
            return true;
        } catch (error) {
            console.error('File delete error:', error);
            return false;
        }
    }

    // Validate file type
    static validateFileType(file, allowedTypes) {
        const fileExt = path.extname(file.originalname).toLowerCase();
        const mimeType = file.mimetype;

        return allowedTypes.some(type => 
            fileExt.includes(type) || mimeType.includes(type)
        );
    }

    // Validate file size
    static validateFileSize(file, maxSizeMB) {
        const maxSize = maxSizeMB * 1024 * 1024; // Convert MB to bytes
        return file.size <= maxSize;
    }
}

module.exports = FileUpload;
const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const auth = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// =============== PUBLIC ROUTES (No authentication required) ===============
// Get all approved properties
router.get('/public', propertyController.getAllProperties);

// Get property by ID (public view)
router.get('/public/:id', propertyController.getPropertyById);

// Search properties
router.get('/public/search', propertyController.searchProperties);

// Filter properties
router.get('/public/filter', propertyController.filterProperties);

// Get properties by city
router.get('/public/city/:city', propertyController.getPropertiesByCity);

// Get properties by type
router.get('/public/type/:type', propertyController.getPropertiesByType);

// Get featured properties
router.get('/public/featured', propertyController.getFeaturedProperties);

// Get properties by owner (public view)
router.get('/public/owner/:ownerId', propertyController.getPropertiesByOwnerPublic);

// =============== PROTECTED ROUTES (Authentication required) ===============

// ✅ Like/Save Routes - For all authenticated users
router.get('/:id/status', auth.verifyToken, propertyController.checkPropertyStatus);
router.post('/:id/save', auth.verifyToken, propertyController.saveProperty);
router.delete('/:id/unsave', auth.verifyToken, propertyController.unsaveProperty);
router.get('/user/saved', auth.verifyToken, propertyController.getSavedProperties);
router.get('/user/counts', auth.verifyToken, propertyController.getUserPropertyCounts);

// ✅ Tenant Only Routes (Like functionality)
router.post('/:id/like',
    auth.verifyToken,
    auth.isTenantOrAdmin,
    propertyController.likeProperty
);

router.delete('/:id/unlike',
    auth.verifyToken,
    auth.isTenantOrAdmin,
    propertyController.unlikeProperty
);

router.get('/user/liked',
    auth.verifyToken,
    auth.isTenantOrAdmin,
    propertyController.getLikedProperties
);

// =============== OWNER DASHBOARD ROUTES ===============
// Get owner's properties (dashboard)
router.get('/owner/properties', auth.verifyToken, auth.isOwnerOrAdmin, propertyController.getOwnerProperties);

// Get specific property by ID (owner's view)
router.get('/owner/:id', auth.verifyToken, auth.isOwnerOrAdmin, propertyController.getProperty);

// Get property statistics for owner
router.get('/owner/stats', auth.verifyToken, auth.isOwnerOrAdmin, propertyController.getPropertyStats);

// Get property analytics overview
router.get('/owner/analytics/overview', auth.verifyToken, auth.isOwnerOrAdmin, propertyController.getAnalyticsOverview);

// Create, Update, Delete property
router.post('/',
    auth.verifyToken,
    auth.isOwnerOrAdmin,
    upload.propertyUpload,
    propertyController.createProperty
);

router.put('/:id',
    auth.verifyToken,
    auth.isOwnerOrAdmin,
    upload.propertyUpload,
    propertyController.updateProperty
);

router.delete('/:id',
    auth.verifyToken,
    auth.isOwnerOrAdmin,
    propertyController.deleteProperty
);

// Image upload routes for owner
router.post('/:id/upload-image',
    auth.verifyToken,
    auth.isOwnerOrAdmin,
    upload.single('image'), // Adjust based on your upload middleware
    propertyController.uploadImage
);

router.delete('/:id/image/:imageId',
    auth.verifyToken,
    auth.isOwnerOrAdmin,
    propertyController.deleteImage
);

// =============== ADMIN ONLY ROUTES ===============
router.get('/admin/all', auth.verifyToken, auth.isAdmin, propertyController.getAllPropertiesAdmin);
router.get('/admin/stats', auth.verifyToken, auth.isAdmin, propertyController.getAdminStats);

module.exports = router;
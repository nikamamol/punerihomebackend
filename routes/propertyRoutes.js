const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const auth = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// ✅ PUBLIC GET ROUTES (No authentication required)
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

// =============== PROTECTED ROUTES ===============
// ✅ Get owner's properties (dashboard) - NEW ROUTE
router.get('/owner/properties', auth.verifyToken, propertyController.getOwnerProperties);

// ✅ PROTECTED GET ROUTES (Authentication required)
router.use(auth.verifyToken);

// Get owner's properties (dashboard) - Old route (you can keep or remove)
router.get('/owner', propertyController.getOwnerProperties);

// Get specific property by ID (owner's view)
router.get('/owner/:id', propertyController.getProperty);

// Get property statistics
router.get('/stats', propertyController.getPropertyStats);

// Get property analytics
router.get('/analytics/overview', propertyController.getAnalyticsOverview);

// ✅ ADMIN GET ROUTES
router.get('/admin/all', auth.isAdmin, propertyController.getAllPropertiesAdmin);
router.get('/admin/stats', auth.isAdmin, propertyController.getAdminStats);

// POST, PUT, DELETE routes (as per your requirement)
router.post('/', upload.propertyUpload, propertyController.createProperty);
router.put('/:id', upload.propertyUpload, propertyController.updateProperty);
router.delete('/:id', propertyController.deleteProperty);

module.exports = router;
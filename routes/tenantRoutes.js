// routes/tenantRoutes.js
const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const auth = require('../middleware/authMiddleware');

// Protected tenant routes
router.get('/profile', auth.verifyToken, auth.isTenantOrAdmin, tenantController.getProfile);
router.put('/profile', auth.verifyToken, auth.isTenantOrAdmin, tenantController.updateProfile);
router.get('/credits', auth.verifyToken, auth.isTenantOrAdmin, tenantController.getCredits);

module.exports = router;
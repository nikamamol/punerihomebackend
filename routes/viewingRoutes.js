const express = require('express');
const router = express.Router();
const viewingController = require('../controllers/viewingController');


// =============== PUBLIC ROUTES ===============
// Create viewing request (No authentication required)
router.post('/request', viewingController.createViewingRequest);

// Get user viewing requests by phone (Public but with phone verification)
router.get('/user/:phone', viewingController.getUserViewingRequests);

// =============== PROTECTED ROUTES ===============
// Get all viewing requests (Admin/Owner only)
router.get('/admin/requests', viewingController.getAllViewingRequests);

// Get viewing request by ID (Admin/Owner only)
router.get('/admin/request/:id', viewingController.getViewingRequestById);

// Update viewing request status (Admin/Owner only)
router.patch('/admin/request/:id/status', viewingController.updateViewingStatus);

module.exports = router;
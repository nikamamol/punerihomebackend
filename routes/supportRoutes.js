const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');


// =============== PUBLIC ROUTES ===============
// Create support ticket (No authentication required)
router.post('/ticket', supportController.createTicket);

// =============== ADMIN ROUTES ===============
// Get all support tickets (Admin only)
router.get('/admin/tickets', supportController.getAllTickets);

// Get ticket by ID (Admin only)
router.get('/admin/ticket/:id', supportController.getTicketById);

// Update ticket status (Admin only)
router.patch('/admin/ticket/:id/status', supportController.updateTicketStatus);

module.exports = router;
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/authMiddleware');

// Create Razorpay order (Auth required)
router.post('/create-order', auth.verifyToken, paymentController.createOrder);

// Verify payment (Auth required)
router.post('/verify-payment', auth.verifyToken, paymentController.verifyPayment);

// Get payment history (Auth required)
router.get('/history', auth.verifyToken, paymentController.getPaymentHistory);

// Use credit for property contact (Tenant only)
router.post('/use-credit', auth.verifyToken, auth.isTenant, paymentController.useCredit);

// Get credit balance (Auth required)
router.get('/credit-balance', auth.verifyToken, paymentController.getCreditBalance);

// Webhook endpoint (no auth for webhook)
router.post('/webhook', paymentController.handleWebhook);

module.exports = router;
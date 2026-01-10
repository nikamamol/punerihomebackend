const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const {
    validateRegistration,
    validateLogin,
    validateOtp,
    validateForgotPassword,
    validateResetPassword
} = require('../middleware/validationMiddleware');

// Test route
router.get('/test', (req, res) => {
    res.json({
        status: 'success',
        message: 'Auth route is working!',
        timestamp: new Date().toISOString()
    });
});

// Register user
router.post('/register', validateRegistration, authController.register);

// Login user
router.post('/login', validateLogin, authController.login);

// Get profile (TEMPORARILY DISABLE if causing error)
router.get('/profile', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Profile route is working (auth not implemented yet)'
    });
});

// Update profile (TEMPORARILY DISABLE if causing error)
router.put('/profile', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Update profile route is working (auth not implemented yet)'
    });
});

// Logout
router.post('/logout', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Logout successful'
    });
});

// Verify email (TEMPORARILY DISABLE if causing error)
router.get('/verify-email/:token', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Email verification route is working'
    });
});

// OTP-based login routes (TEMPORARILY DISABLE if causing error)
router.post('/send-otp', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'OTP sent (demo mode)',
        data: { otp: '123456' }
    });
});

router.post('/verify-otp', validateOtp, (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'OTP verified (demo mode)',
        data: { token: 'demo_token' }
    });
});

// Forgot password routes (TEMPORARILY DISABLE if causing error)
router.post('/forgot-password', validateForgotPassword, (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Password reset link sent (demo mode)'
    });
});

router.post('/reset-password', validateResetPassword, (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Password reset successful (demo mode)'
    });
});

module.exports = router;
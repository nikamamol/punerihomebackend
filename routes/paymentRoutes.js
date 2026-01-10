const express = require('express');
const router = express.Router();

// @route   GET api/payments/test
// @desc    Test payments route
// @access  Public
router.get('/test', (req, res) => {
    res.json({
        status: 'success',
        message: 'Payments route is working!',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
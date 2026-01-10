const express = require('express');
const router = express.Router();

// @route   GET api/users/test
// @desc    Test users route
// @access  Public
router.get('/test', (req, res) => {
    res.json({
        status: 'success',
        message: 'Users route is working!',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
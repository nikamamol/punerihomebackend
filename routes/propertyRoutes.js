const express = require('express');
const router = express.Router();

// @route   GET api/properties/test
// @desc    Test properties route
// @access  Public
router.get('/test', (req, res) => {
    res.json({
        status: 'success',
        message: 'Properties route is working!',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
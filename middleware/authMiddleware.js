const jwt = require('jsonwebtoken');

const authMiddleware = {
    // Verify JWT token
    verifyToken: (req, res, next) => {
        try {
            // Get token from header or cookie
            let token = req.cookies?.token || 
                       req.headers['authorization']?.replace('Bearer ', '') || 
                       req.headers['x-access-token'];

            if (!token) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Access denied. No token provided.'
                });
            }

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            next();

        } catch (error) {
            console.error('Token verification error:', error.message);

            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    status: 'error',
                    message: 'Token expired. Please login again.'
                });
            }

            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    status: 'error',
                    message: 'Invalid token. Please login again.'
                });
            }

            res.status(401).json({
                status: 'error',
                message: 'Authentication failed'
            });
        }
    },

    // Check if user is admin
    isAdmin: (req, res, next) => {
        if (req.user.userType !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Access denied. Admin only.'
            });
        }
        next();
    },

    // Check if user is owner
    isOwner: (req, res, next) => {
        if (req.user.userType !== 'owner') {
            return res.status(403).json({
                status: 'error',
                message: 'Access denied. Property owners only.'
            });
        }
        next();
    },

    // Check if user is tenant
    isTenant: (req, res, next) => {
        if (req.user.userType !== 'tenant') {
            return res.status(403).json({
                status: 'error',
                message: 'Access denied. Tenants only.'
            });
        }
        next();
    },

    // Check if user is owner or admin
    isOwnerOrAdmin: (req, res, next) => {
        if (req.user.userType !== 'owner' && req.user.userType !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Access denied. Owners or admins only.'
            });
        }
        next();
    },

    // Check if user is tenant or admin
    isTenantOrAdmin: (req, res, next) => {
        if (req.user.userType !== 'tenant' && req.user.userType !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Access denied. Tenants or admins only.'
            });
        }
        next();
    }
};

module.exports = authMiddleware;
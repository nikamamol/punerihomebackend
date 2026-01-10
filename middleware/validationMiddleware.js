const { body, validationResult } = require('express-validator');
const User = require('../models/User');

// Registration validation middleware
const validateRegistration = [
    // Common fields
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s]*$/).withMessage('Name can only contain letters and spaces'),

    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail()
        .custom(async (email) => {
            const exists = await User.emailExists(email);
            if (exists) {
                throw new Error('Email already registered');
            }
            return true;
        }),

    body('phone')
        .trim()
        .notEmpty().withMessage('Phone number is required')
        .matches(/^[0-9]{10}$/).withMessage('Phone must be 10 digits')
        .custom(async (phone) => {
            const exists = await User.phoneExists(phone);
            if (exists) {
                throw new Error('Phone number already registered');
            }
            return true;
        }),

    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('Password must contain letters and numbers'),

    body('confirmPassword')
        .notEmpty().withMessage('Please confirm your password')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),

    body('userType')
        .notEmpty().withMessage('User type is required')
        .isIn(['tenant', 'owner', 'admin']).withMessage('Invalid user type'),

    // Tenant specific validations
    body('occupation')
        .if(body('userType').equals('tenant'))
        .notEmpty().withMessage('Occupation is required for tenants'),

    body('familyMembers')
        .if(body('userType').equals('tenant'))
        .notEmpty().withMessage('Number of family members is required')
        .isIn(['1', '2', '3', '4', '5+']).withMessage('Invalid family members selection'),

    // Owner specific validations
    body('propertyType')
        .if(body('userType').equals('owner'))
        .notEmpty().withMessage('Property type is required for owners'),

    body('companyName')
        .if(body('userType').equals('owner'))
        .notEmpty().withMessage('Company/Individual name is required for owners')
        .isLength({ min: 2, max: 200 }).withMessage('Company name must be between 2 and 200 characters'),

    // Admin specific validations
    body('adminCode')
        .if(body('userType').equals('admin'))
        .notEmpty().withMessage('Admin code is required')
        .custom((value) => {
            // In production, this should check against a secure storage
            const validAdminCodes = ['ADMIN2024', 'SUPERADMIN', 'PUNERIHOMES'];
            if (!validAdminCodes.includes(value)) {
                throw new Error('Invalid admin code');
            }
            return true;
        }),

    body('department')
        .if(body('userType').equals('admin'))
        .notEmpty().withMessage('Department is required for admin'),

    // Optional fields validation
    body('budget')
        .optional()
        .isInt({ min: 0 }).withMessage('Budget must be a positive number'),

    body('totalProperties')
        .optional()
        .matches(/^(1|2-5|6-10|10\+)$/).withMessage('Invalid total properties selection'),

    // Handle validation errors
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg
                }))
            });
        }
        next();
    }
];

const validateLogin = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('Password is required'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg
                }))
            });
        }
        next();
    }
];

// OTP validation middleware
const validateOtp = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format'),

    body('otp')
        .trim()
        .notEmpty().withMessage('OTP is required')
        .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
        .matches(/^[0-9]+$/).withMessage('OTP must contain only numbers'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        next();
    }
];

// Forgot password validation
const validateForgotPassword = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        next();
    }
];

// Reset password validation
const validateResetPassword = [
    body('token')
        .notEmpty().withMessage('Reset token is required'),

    body('newPassword')
        .notEmpty().withMessage('New password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('Password must contain letters and numbers'),

    body('confirmPassword')
        .notEmpty().withMessage('Please confirm your password')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        next();
    }
];

module.exports = {
  validateRegistration,
    validateLogin,
    validateOtp,
    validateForgotPassword,
    validateResetPassword
};
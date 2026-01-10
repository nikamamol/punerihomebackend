const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT Token
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            userType: user.user_type,
            name: user.name
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

// Helper function to get redirect path
const getRedirectPath = (userType) => {
    switch (userType) {
        case 'tenant':
            return '/tenant-dashboard';
        case 'owner':
            return '/owner-dashboard';
        case 'admin':
            return '/admin-dashboard';
        default:
            return '/dashboard';
    }
};

const authController = {
    // Register new user
    async register(req, res) {
        try {
            const {
                name,
                email,
                phone,
                password,
                userType,
                occupation,
                familyMembers,
                preferredLocation,
                budget,
                moveInDate,
                propertyType,
                totalProperties,
                companyName,
                address,
                adminCode,
                department
            } = req.body;

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Prepare base user data
            const userData = {
                name,
                email,
                phone,
                password: hashedPassword,
                user_type: userType
            };

            // Set role-specific fields and defaults
            switch (userType) {
                case 'tenant':
                    userData.occupation = occupation;
                    userData.family_members = familyMembers;
                    userData.preferred_location = preferredLocation || null;
                    userData.budget = budget ? parseInt(budget) : null;
                    userData.move_in_date = moveInDate || null;
                    userData.is_verified = 0;
                    userData.credits = 1;
                    userData.total_properties_allowed = 0;
                    break;

                case 'owner':
                    userData.property_type = propertyType;
                    userData.total_properties = totalProperties || '1';
                    userData.company_name = companyName;
                    userData.address = address || null;
                    userData.is_verified = 0;
                    userData.credits = 0;
                    userData.total_properties_allowed = 1;
                    break;

                case 'admin':
                    userData.department = department;
                    userData.is_verified = 1;
                    userData.credits = 9999;
                    userData.total_properties_allowed = 9999;
                    break;
            }

            // Set defaults for all types
            userData.occupation = userData.occupation || null;
            userData.family_members = userData.family_members || null;
            userData.preferred_location = userData.preferred_location || null;
            userData.budget = userData.budget || null;
            userData.move_in_date = userData.move_in_date || null;
            userData.property_type = userData.property_type || null;
            userData.total_properties = userData.total_properties || '0';
            userData.company_name = userData.company_name || null;
            userData.address = userData.address || null;
            userData.department = userData.department || null;

            console.log('Creating user with data:', userData);

            // Create user
            const user = await User.create(userData);

            // Generate JWT token
            const token = generateToken(user);

            // Set HTTP-only cookie
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                sameSite: 'strict'
            });

            // Send response
            res.status(201).json({
                status: 'success',
                message: `${userType.charAt(0).toUpperCase() + userType.slice(1)} registered successfully`,
                data: {
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        phone: user.phone,
                        userType: user.user_type,
                        occupation: user.occupation,
                        familyMembers: user.family_members,
                        preferredLocation: user.preferred_location,
                        budget: user.budget,
                        credits: user.credits || 0,
                        totalPropertiesAllowed: user.total_properties_allowed || 1,
                        isVerified: user.is_verified || 0,
                        createdAt: user.created_at
                    },
                    token
                }
            });

        } catch (error) {
            console.error('Registration error:', error);

            // Handle specific errors
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({
                    status: 'error',
                    message: 'Email or phone already registered'
                });
            }

            if (error.code === 'ER_NO_DEFAULT_FOR_FIELD') {
                return res.status(400).json({
                    status: 'error',
                    message: 'Missing required fields',
                    error: error.sqlMessage
                });
            }

            res.status(500).json({
                status: 'error',
                message: 'Failed to register user',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },

    // LOGIN USER (Updated to handle email/ID login)
    async login(req, res) {
        try {
            const { loginId, email, password } = req.body;
            
            // Validate input
            if (!email || !password) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Email and password are required'
                });
            }

            // Find user by email
            const user = await User.findByEmail(email);
            
            if (!user) {
                // If user not found by email, check if it's an ID
                if (loginId) {
                    // You can implement ID-based login if needed
                    return res.status(401).json({
                        status: 'error',
                        message: 'Invalid credentials'
                    });
                }
                
                return res.status(401).json({
                    status: 'error',
                    message: 'Invalid email or password'
                });
            }

            // Check if user is verified (for non-admin users)
            if (user.user_type !== 'admin' && user.is_verified !== 1) {
                return res.status(403).json({
                    status: 'error',
                    message: 'Account not verified. Please verify your email first.'
                });
            }

            // Verify password
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Invalid email or password'
                });
            }

            // Generate JWT token
            const token = generateToken(user);

            // Set cookie (optional)
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                sameSite: 'strict'
            });

            // Prepare user response (remove sensitive data)
            const userResponse = {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                userType: user.user_type,
                occupation: user.occupation,
                familyMembers: user.family_members,
                preferredLocation: user.preferred_location,
                budget: user.budget,
                propertyType: user.property_type,
                totalProperties: user.total_properties,
                companyName: user.company_name,
                address: user.address,
                department: user.department,
                credits: user.credits || 0,
                totalPropertiesAllowed: user.total_properties_allowed || 1,
                isVerified: user.is_verified || 0,
                profileImage: user.profile_image,
                createdAt: user.created_at
            };

            // Add user ID prefix for frontend
            let userIdPrefix = '';
            switch (user.user_type) {
                case 'tenant':
                    userIdPrefix = 'TEN';
                    break;
                case 'owner':
                    userIdPrefix = 'OWN';
                    break;
                case 'admin':
                    userIdPrefix = 'ADM';
                    break;
            }
            
            userResponse.displayId = `${userIdPrefix}${user.id.toString().padStart(4, '0')}`;

            res.status(200).json({
                status: 'success',
                message: 'Login successful',
                data: {
                    user: userResponse,
                    token,
                    redirectTo: getRedirectPath(user.user_type)
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to login',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },

    // Logout user
    async logout(req, res) {
        try {
            res.clearCookie('token');
            res.status(200).json({
                status: 'success',
                message: 'Logged out successfully'
            });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to logout'
            });
        }
    },

    // Get current user profile
    async getProfile(req, res) {
        try {
            const token = req.cookies?.token || req.headers['authorization']?.replace('Bearer ', '');
            
            if (!token) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Not authenticated'
                });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);

            if (!user) {
                return res.status(404).json({
                    status: 'error',
                    message: 'User not found'
                });
            }

            // Remove password from response
            delete user.password;

            res.status(200).json({
                status: 'success',
                data: { user }
            });

        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to get profile'
            });
        }
    },

    // Update user profile
    async updateProfile(req, res) {
        try {
            const token = req.cookies?.token || req.headers['authorization']?.replace('Bearer ', '');
            
            if (!token) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Not authenticated'
                });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const updateData = req.body;

            // Don't allow updating sensitive fields
            delete updateData.password;
            delete updateData.email;
            delete updateData.user_type;
            delete updateData.is_verified;
            delete updateData.credits;
            delete updateData.total_properties_allowed;

            const updated = await User.update(decoded.id, updateData);

            if (!updated) {
                return res.status(404).json({
                    status: 'error',
                    message: 'User not found'
                });
            }

            const user = await User.findById(decoded.id);
            delete user.password;

            res.status(200).json({
                status: 'success',
                message: 'Profile updated successfully',
                data: { user }
            });

        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to update profile'
            });
        }
    },

    // Forgot Password - Send reset email
    async forgotPassword(req, res) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Email is required'
                });
            }

            const user = await User.findByEmail(email);
            
            if (!user) {
                // Don't reveal that user doesn't exist (security best practice)
                return res.status(200).json({
                    status: 'success',
                    message: 'If an account exists with this email, you will receive a password reset link'
                });
            }

            // Generate reset token
            const resetToken = jwt.sign(
                { id: user.id, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            // TODO: Send email with reset link
            // const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

            // For now, return token in response (in production, send email)
            res.status(200).json({
                status: 'success',
                message: 'Password reset instructions sent to your email',
                data: {
                    resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
                }
            });

        } catch (error) {
            console.error('Forgot password error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to process forgot password request'
            });
        }
    },

    // Reset Password
    async resetPassword(req, res) {
        try {
            const { token, newPassword, confirmPassword } = req.body;

            if (!token || !newPassword || !confirmPassword) {
                return res.status(400).json({
                    status: 'error',
                    message: 'All fields are required'
                });
            }

            if (newPassword !== confirmPassword) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Passwords do not match'
                });
            }

            // Verify reset token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Hash new password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            // Update password
            await User.update(decoded.id, { password: hashedPassword });

            res.status(200).json({
                status: 'success',
                message: 'Password reset successfully. You can now login with your new password.'
            });

        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(400).json({
                    status: 'error',
                    message: 'Reset token has expired. Please request a new one.'
                });
            }

            if (error.name === 'JsonWebTokenError') {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid reset token'
                });
            }

            console.error('Reset password error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to reset password'
            });
        }
    },

    // Verify OTP (for OTP-based login)
    async verifyOtp(req, res) {
        try {
            const { email, otp } = req.body;

            if (!email || !otp) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Email and OTP are required'
                });
            }

            // TODO: Implement actual OTP verification logic
            // For now, simulate OTP verification
            const user = await User.findByEmail(email);
            
            if (!user) {
                return res.status(404).json({
                    status: 'error',
                    message: 'User not found'
                });
            }

            // In production, verify OTP from database/Redis
            if (otp !== '123456') { // Demo OTP
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid OTP'
                });
            }

            // Generate JWT token
            const jwtToken = generateToken(user);

            res.status(200).json({
                status: 'success',
                message: 'OTP verified successfully',
                data: {
                    token: jwtToken,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        userType: user.user_type
                    }
                }
            });

        } catch (error) {
            console.error('OTP verification error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to verify OTP'
            });
        }
    },

    // Send OTP
    async sendOtp(req, res) {
        try {
            const { email, phone } = req.body;

            if (!email && !phone) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Email or phone is required'
                });
            }

            let user;
            if (email) {
                user = await User.findByEmail(email);
            } else if (phone) {
                user = await User.findByPhone(phone);
            }

            if (!user) {
                return res.status(404).json({
                    status: 'error',
                    message: 'User not found'
                });
            }

            // TODO: Generate and send actual OTP
            // For demo, return success
            const demoOtp = '123456'; // In production, generate random OTP

            res.status(200).json({
                status: 'success',
                message: 'OTP sent successfully',
                data: {
                    // In development, include OTP for testing
                    otp: process.env.NODE_ENV === 'development' ? demoOtp : undefined,
                    expiresIn: 300 // 5 minutes
                }
            });

        } catch (error) {
            console.error('Send OTP error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to send OTP'
            });
        }
    }
};

module.exports = authController;
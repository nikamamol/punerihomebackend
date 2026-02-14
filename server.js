const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const path = require('path');
const cloudinary = require('cloudinary').v2;

// Load environment variables
dotenv.config();

// Initialize Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Test Cloudinary connection
async function testCloudinaryConnection() {
  try {
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary connected successfully');
    console.log(`📁 Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
  } catch (error) {
    console.error('❌ Cloudinary connection failed:', error.message);
    console.log('ℹ️  Make sure your Cloudinary credentials are correct in .env file');
  }
}

testCloudinaryConnection();

const app = express();
const PORT = process.env.PORT || 5000;

// Import routes
const authRoutes = require('./routes/authRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const tenantRoutes = require('./routes/propertyRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const supportRoutes = require('./routes/supportRoutes');
const viewingRoutes = require('./routes/viewingRoutes');

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://mypunerihomes.vercel.app/',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);

  // Log file upload info
  if (req.files) {
    console.log(`📎 Files uploaded: ${Object.keys(req.files).length} fields`);
    Object.keys(req.files).forEach(field => {
      const files = Array.isArray(req.files[field]) ? req.files[field] : [req.files[field]];
      console.log(`   - ${field}: ${files.length} file(s)`);
    });
  }

  next();
});

// ============ ROUTES ============
// Property routes (with file upload)
app.use('/api/properties', propertyRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/viewing', viewingRoutes);

// Static files (if you still need local uploads for something)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Cloudinary test route
app.get('/api/cloudinary/test', async (req, res) => {
  try {
    // Test Cloudinary connection
    const pingResult = await cloudinary.api.ping();

    // Try to get account info
    const accountInfo = await cloudinary.api.account();

    res.status(200).json({
      status: 'success',
      message: 'Cloudinary is working!',
      cloudinary: {
        connected: true,
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Not set',
        plan: accountInfo.plan,
        credits: accountInfo.credits
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Cloudinary connection failed',
      error: error.message,
      cloudinary: {
        connected: false,
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Not set'
      }
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    environment: process.env.NODE_ENV || 'development',
    cloudinary: {
      configured: !!process.env.CLOUDINARY_CLOUD_NAME,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'Not set'
    },
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Welcome route
app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to PuneRiHomes API',
    version: '1.0.0',
    features: {
      cloudinary: 'File upload to Cloudinary',
      auth: 'JWT Authentication',
      properties: 'Property management'
    },
    endpoints: {
      health: 'GET /api/health',
      cloudinary_test: 'GET /api/cloudinary/test',
      auth: '/api/auth',
      properties: '/api/properties'
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);

// Placeholder routes for other modules
app.get('/api/users/test', (req, res) => {
  res.json({
    status: 'success',
    message: 'Users route working',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/properties/test', (req, res) => {
  res.json({
    status: 'success',
    message: 'Properties route working',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/payments/test', (req, res) => {
  res.json({
    status: 'success',
    message: 'Payments route working',
    timestamp: new Date().toISOString()
  });
});

// File upload test route
app.post('/api/upload-test', async (req, res) => {
  try {
    // Check if it's a multipart request
    if (!req.is('multipart/form-data')) {
      return res.status(400).json({
        status: 'error',
        message: 'Request must be multipart/form-data'
      });
    }

    res.json({
      status: 'success',
      message: 'Upload endpoint is ready',
      cloudinary: {
        configured: true,
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Upload test failed',
      error: error.message
    });
  }
});

// ============ ERROR HANDLING ============

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
    method: req.method,
    timestamp: new Date().toISOString(),
    availableRoutes: [
      'GET    /api/health',
      'GET    /api/cloudinary/test',
      'GET    /api',
      'POST   /api/upload-test',
      'POST   /api/auth/register',
      'POST   /api/auth/login',
      'GET    /api/auth/profile',
      'PUT    /api/auth/profile',
      'POST   /api/auth/logout',
      'POST   /api/properties (upload property with files)',
      'GET    /api/properties',
      'GET    /api/properties/:id',
      'PUT    /api/properties/:id',
      'DELETE /api/properties/:id'
    ]
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('💥 Server Error:', err.message);
  console.error(err.stack);

  // Handle file upload errors specifically
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      status: 'error',
      message: 'File too large. Maximum size is 100MB per file.',
      code: 'FILE_TOO_LARGE'
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      status: 'error',
      message: 'Too many files. Maximum 20 images allowed.',
      code: 'TOO_MANY_FILES'
    });
  }

  if (err.message.includes('file type')) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid file type. Please upload only images, videos or audio files.',
      code: 'INVALID_FILE_TYPE'
    });
  }

  const statusCode = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    status: 'error',
    message: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      error: err
    })
  });
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server Started Successfully on port ${PORT}!`);

});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});
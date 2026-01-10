const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Import routes
const authRoutes = require('./routes/authRoutes');

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173/',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// ============ ROUTES ============

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Welcome route
app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to PuneRiHomes API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      properties: '/api/properties',
      payments: '/api/payments'
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

// ============ ERROR HANDLING ============

// 404 Handler - Fixed pattern
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
    method: req.method,
    timestamp: new Date().toISOString(),
    availableRoutes: [
      'GET    /api/health',
      'GET    /api',
      'GET    /api/auth/test',
      'POST   /api/auth/register',
      'POST   /api/auth/login',
      'GET    /api/auth/profile',
      'PUT    /api/auth/profile',
      'POST   /api/auth/logout',
      'GET    /api/users/test',
      'GET    /api/properties/test',
      'GET    /api/payments/test'
    ]
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('💥 Server Error:', err.message);
  console.error(err.stack);

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
  console.log(` Server Started Successfully!`);
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
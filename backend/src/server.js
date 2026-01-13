require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const config = require('./config/app.config');
const errorHandler = require('./middleware/errorHandler');

// Import master routes
const masterRoutes = require('./master/routes');

// Import module routes  
const researchPatentRoutes = require('./modules/research-patent/routes');

const app = express();

// Trust proxy for load balancer (important for rate limiting with 25k users)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors(config.cors));

// Rate limiting - Separate limiters for different endpoints
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 min per IP
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply strict rate limit to login
app.use('/api/*/auth/login', loginLimiter);

// Apply general rate limit to all API routes
app.use('/api/', apiLimiter);

// Body parsing middleware with size limits for security
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Compression for responses (reduces bandwidth for 25k users)
const compression = require('compression');
app.use(compression());

// Logging
if (config.env === 'development') {
  app.use(morgan('dev'));
  
  // Response time logging for performance monitoring
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (duration > 500) { // Log slow requests (>500ms)
        console.warn(`⚠️ SLOW REQUEST: ${req.method} ${req.path} - ${duration}ms`);
      }
    });
    next();
  });
}

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Cache stats endpoint
app.get('/cache/stats', async (req, res) => {
  try {
    const cache = require('./config/redis');
    const stats = await cache.getStats();
    res.status(200).json({ 
      success: true,
      data: stats 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Cache flush endpoint (admin only - no auth for now)
app.post('/cache/flush', async (req, res) => {
  try {
    const cache = require('./config/redis');
    await cache.flush();
    res.status(200).json({ 
      success: true,
      message: 'Cache flushed successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// API routes
const API_PREFIX = `/api/${config.apiVersion}`;

// Master system routes (auth, dashboard, permissions, etc.)
app.use(`${API_PREFIX}`, masterRoutes);

// Module routes
app.use(`${API_PREFIX}/modules/research-patent`, researchPatentRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Start server
const startServer = async () => {
  try {
    const prisma = require('./config/database');
    await prisma.$connect();
    
    // Initialize Redis cache (with fallback to memory cache)
    const cache = require('./config/redis');
    await cache.initRedis();
    
    app.listen(config.port, () => {
      console.log(`✅ Server running in ${config.env} mode on port ${config.port}`);
      console.log(`🔗 API available at http://localhost:${config.port}${API_PREFIX}`);
      console.log(`🗄️  Database connected via Prisma`);
      console.log(`📦 Cache initialized (${cache.isConnected() ? 'Redis' : 'Memory fallback'})`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;

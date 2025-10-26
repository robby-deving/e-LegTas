// app.js
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const morgan = require('morgan');
const logger = require('./utils/logger');
const { router, baseAPI } = require('./routes/router');
const { ensureReportsBucket } = require('./config/storage');
const { globalRateLimit } = require('./middleware/rateLimiting');
const { ipAddressMiddleware } = require('./utils/ipAddress');

// Load environment variables
dotenv.config();

// Initialize the Express application
const app = express();
app.set('trust proxy', true)
// Environment variables check
logger.info('Environment variables check');
logger.info('SUPABASE_URL status', { present: !!process.env.SUPABASE_URL });
logger.info('SUPABASE_SERVICE_ROLE_KEY status', { present: !!process.env.SUPABASE_SERVICE_ROLE_KEY });
logger.info('SMTP_USER status', { present: !!process.env.SMTP_USER });
logger.info('SMTP_PASS status', { present: !!process.env.SMTP_PASS });

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'https://www.e-legtas.tech'],
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With', 'x-api-key'],
  exposedHeaders: ['Content-Disposition'],
  optionsSuccessStatus: 204
}));

app.use(cookieParser());
app.use(express.json());

// IP address detection middleware - must be before rate limiting
app.use(ipAddressMiddleware);

// Global rate limiting - applies to all requests
app.use(globalRateLimit);

// HTTP request logging (Morgan -> Winston)
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', { stream: logger.stream }));

// API Routes
app.use(baseAPI, router);

// Root health check (for backwards compatibility)
app.get('/api/health', (req, res) => {
  logger.info('Server is running');
  res.json({ 
    message: 'Server is running',
    note: 'Use /api/v1/health for versioned endpoint'
  });
});

module.exports = app;
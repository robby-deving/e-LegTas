
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const { router, baseAPI } = require('./routes/router');

dotenv.config();

const app = express();

// Environment variables check
console.log('Environment variables check:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Found' : 'Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Found' : 'Missing');
console.log('SMTP_USER:', process.env.SMTP_USER ? 'Found' : 'Missing');
console.log('SMTP_PASS:', process.env.SMTP_PASS ? 'Found' : 'Missing');

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());

// API Routes
app.use(baseAPI, router);

// Root health check (for backwards compatibility)
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'Server is running',
    note: 'Use /api/v1/health for versioned endpoint'
  });
});

module.exports = app;

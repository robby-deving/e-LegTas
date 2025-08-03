const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const permissionRoutes = require('./permission.routes');

const router = express.Router();
const baseAPI = '/api/v1';

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/permissions', permissionRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.json({ 
    message: 'Server is running',
    version: 'v1',
    timestamp: new Date().toISOString()
  });
});

module.exports = { router, baseAPI };

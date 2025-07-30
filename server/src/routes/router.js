// router.js

const express = require('express');
const router = express.Router();
const evacuationCentersRoutes = require('./evacuationCenters.routes'); 
const roomRoutes = require('./room.routes'); 
const disasterRoutes = require('./disaster.routes');
const dashboardRoutes = require('./dashboard.routes'); 

// ---------- Routes ----------
const baseAPI = '/api/v1';

router.use(`${baseAPI}/evacuation-centers`, evacuationCentersRoutes);
router.use(`${baseAPI}/disasters`, disasterRoutes);
router.use(`${baseAPI}/rooms`, roomRoutes);
router.use(`${baseAPI}/dashboard`, dashboardRoutes);

router.get('/', (req, res) => {
    res.status(200).json({ message: 'API router is working!' });
});

module.exports = router;

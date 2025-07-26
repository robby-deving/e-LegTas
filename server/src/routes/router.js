// router.js

const express = require('express');
const router = express.Router();
const evacuationCentersRoutes = require('./evacuationCenters.routes'); // Import the evacuation centers routes

// ---------- Routes ----------
const baseAPI = '/api/v1';

router.use(`${baseAPI}/evacuation-centers`, evacuationCentersRoutes);

router.get('/', (req, res) => {
    res.status(200).json({ message: 'API router is working!' });
});

module.exports = router;

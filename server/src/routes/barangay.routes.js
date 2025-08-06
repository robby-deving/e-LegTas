const express = require('express');
const router = express.Router();
const { getBarangays } = require('../controllers/barangay.controller');

router.get('/', getBarangays);

module.exports = router; 
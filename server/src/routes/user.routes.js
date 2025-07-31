const express = require('express');
const { 
  createUser, 
  getUsers, 
  getUserById, 
  getUsersByRole,
  getUsersWithRoleFourAndFive,
  getRoles, 
  getEvacuationCenters, 
  getBarangays,
  getEnumValues
} = require('../controllers/user.controller');

const router = express.Router();

// Helper routes for dropdowns (put these before /:id to avoid conflicts)
router.get('/data/roles', getRoles);              // GET /api/v1/users/data/roles
router.get('/data/evacuation-centers', getEvacuationCenters); // GET /api/v1/users/data/evacuation-centers
router.get('/data/barangays', getBarangays);      // GET /api/v1/users/data/barangays
router.get('/data/enums', getEnumValues);         // GET /api/v1/users/data/enums

// Specific user routes (put before general routes to avoid conflicts)
router.get('/role/:roleId', getUsersByRole);   // GET /api/v1/users/role/5
router.get('/cswdo', getUsersWithRoleFourAndFive);   // GET /api/v1/users/cswdo

// User routes
router.post('/', createUser);           // POST /api/v1/users
router.get('/', getUsers);              // GET /api/v1/users
router.get('/:id', getUserById);        // GET /api/v1/users/:id

module.exports = router;

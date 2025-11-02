const express = require('express');
const { 
  getPermissions,
  getRolePermissions,
  updateRolePermissions,
  getUserPermissions
} = require('../controllers/permission.controller');
const { authenticateUser, requirePermission } = require('../middleware');
const { validateParams, validateBody } = require('../middleware/inputValidation');

const router = express.Router();

// Apply authentication middleware to all permission routes
router.use(authenticateUser);

// Permission routes
router.get('/', getPermissions);                    // GET /api/v1/permissions

router.get('/role/:roleId', 
  validateParams({
    roleId: { validator: 'integer' }
  }),
  getRolePermissions
);

// Editing role permissions requires edit_user_permission
router.put('/role/:roleId', 
  requirePermission('edit_user_permission'),
  validateParams({
    roleId: { validator: 'integer' }
  }),
  validateBody({
    permissionIds: { 
      validator: 'custom',
      required: true,
      customValidator: (value) => {
        if (!Array.isArray(value)) {
          return { isValid: false, error: 'permissionIds must be an array' };
        }
        if (value.length === 0) {
          return { isValid: true, sanitized: value }; // Allow empty array to remove all permissions
        }
        // Validate that all items are positive integers
        for (let i = 0; i < value.length; i++) {
          const num = parseInt(value[i], 10);
          if (isNaN(num) || num < 1) {
            return { isValid: false, error: `permissionIds[${i}] must be a positive integer` };
          }
        }
        return { isValid: true, sanitized: value.map(id => parseInt(id, 10)) };
      }
    }
  }),
  updateRolePermissions
);

router.get('/user/:userId', 
  validateParams({
    userId: { validator: 'integer' }
  }),
  getUserPermissions
);

module.exports = router;

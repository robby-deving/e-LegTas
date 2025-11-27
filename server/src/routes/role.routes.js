const express = require('express');
const router = express.Router();
const { createRole, deleteRole, updateRole } = require('../controllers/user.controller');
const { authenticateUser, requirePermission } = require('../middleware');
const { validateParams, validateBody } = require('../middleware/inputValidation');

// All role routes require auth
router.use(authenticateUser);

// Create Role (creating with permissions should require add_user_permission for assigning)
router.post('/', 
  requirePermission('create_role'),
  validateBody({
    role_name: {
      validator: 'string',
      required: true,
      options: { minLength: 1, maxLength: 100, allowSpecialChars: false }
    },
    permissions: {
      validator: 'array',
      required: false,
      options: { itemValidator: (item) => ({ isValid: typeof item === 'string' && item.trim().length > 0, error: 'Permission must be a non-empty string' }) }
    }
  }),
  createRole
);

// Update Role name
router.put('/:id', 
  requirePermission('update_role'),
  validateParams({
    id: { validator: 'integer' }
  }),
  validateBody({
    role_name: {
      validator: 'string',
      required: false,
      options: { minLength: 1, maxLength: 100, allowSpecialChars: false }
    },
    permissions: {
      validator: 'array',
      required: false,
      options: { itemValidator: (item) => ({ isValid: typeof item === 'string' && item.trim().length > 0, error: 'Permission must be a non-empty string' }) }
    }
  }),
  updateRole
);

// Delete Role
router.delete('/:id', 
  requirePermission('delete_role'),
  validateParams({
    id: { validator: 'integer' }
  }),
  deleteRole
);

module.exports = router;



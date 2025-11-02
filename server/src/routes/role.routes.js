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
    name: { 
      validator: 'string', 
      required: true, 
      options: { minLength: 1, maxLength: 100, allowSpecialChars: false }
    },
    description: { 
      validator: 'string', 
      required: false, 
      options: { minLength: 1, maxLength: 500, allowSpecialChars: false }
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
    name: { 
      validator: 'string', 
      required: false, 
      options: { minLength: 1, maxLength: 100, allowSpecialChars: false }
    },
    description: { 
      validator: 'string', 
      required: false, 
      options: { minLength: 1, maxLength: 500, allowSpecialChars: false }
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



const express = require('express');
const router = express.Router();
const { createRole, deleteRole, updateRole } = require('../controllers/user.controller');
const { authenticateUser, requirePermission } = require('../middleware');

// All role routes require auth
router.use(authenticateUser);

// Create Role (creating with permissions should require add_user_permission for assigning)
router.post('/', requirePermission('create_role'), createRole);

// Update Role name
router.put('/:id', requirePermission('update_role'), updateRole);

// Delete Role
router.delete('/:id', requirePermission('delete_role'), deleteRole);

module.exports = router;



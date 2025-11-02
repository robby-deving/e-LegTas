// server/src/routes/reports.routes.js
const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller');
const { requirePermission } = require('../middleware');
const { validateBody, validateQuery, validateParams } = require('../middleware/inputValidation');

// Custom validation middleware for report generation XOR logic
const validateReportScope = (req, res, next) => {
  const { disaster_id, disaster_evacuation_event_id } = req.body || {};
  
  const hasDisaster = disaster_id !== undefined && disaster_id !== null && disaster_id !== '';
  const hasEvent = disaster_evacuation_event_id !== undefined && 
                   disaster_evacuation_event_id !== null && 
                   disaster_evacuation_event_id !== '';
  
  // XOR: exactly one must be provided
  if (hasDisaster === hasEvent) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: ['Provide exactly one of: disaster_id OR disaster_evacuation_event_id (not both, not neither)']
    });
  }
  
  next();
};

// Define routes for report generation and management
router.post(
  '/generate',
  requirePermission('create_report'),
  validateBody({
    report_name: { 
      validator: 'string', 
      required: true, 
      options: { minLength: 1, maxLength: 255, allowSpecialChars: false } 
    },
    report_type_id: { 
      validator: 'integer', 
      required: true 
    },
    disaster_id: { 
      validator: 'integer', 
      required: false 
    },
    disaster_evacuation_event_id: { 
      validator: 'integer', 
      required: false 
    },
    as_of: { 
      validator: 'string', 
      required: true,
      options: { minLength: 1, maxLength: 50, allowSpecialChars: true }
    },
    file_format: { 
      validator: 'string', 
      required: true,
      options: { minLength: 2, maxLength: 10, allowSpecialChars: false }
    },
    generated_by_user_id: { 
      validator: 'integer', 
      required: false 
    },
    barangay_id: { 
      validator: 'integer', 
      required: false 
    }
  }),
  validateReportScope,
  reportsController.generateReport
);

// Route to get all reports
router.get(
  '/getAllReports',
  requirePermission('view_reports'),
  validateQuery({
    disaster_id: { 
      validator: 'integer', 
      required: false 
    },
    disaster_evacuation_event_id: { 
      validator: 'integer', 
      required: false 
    },
    report_type_id: { 
      validator: 'integer', 
      required: false 
    },
    file_format: { 
      validator: 'string', 
      required: false,
      options: { minLength: 2, maxLength: 10, allowSpecialChars: false }
    },
    search: { 
      validator: 'string', 
      required: false,
      options: { minLength: 1, maxLength: 100, allowSpecialChars: false }
    },
    sort_by: { 
      validator: 'string', 
      required: false,
      options: { minLength: 1, maxLength: 50, allowSpecialChars: false }
    },
    sort_dir: { 
      validator: 'string', 
      required: false,
      options: { minLength: 3, maxLength: 4, allowSpecialChars: false }
    },
    include_deleted: { 
      validator: 'string', 
      required: false,
      options: { minLength: 4, maxLength: 5, allowSpecialChars: false }
    }
  }),
  reportsController.getAllReports
);

// Route to delete a report by ID
router.delete(
  '/:id',
  requirePermission('delete_report'),
  validateParams({
    id: { validator: 'integer' }
  }),
  reportsController.deleteReport
);

// Routes to get report types and options
router.get(
  '/types',
  requirePermission('view_reports'),
  reportsController.getReportTypes
);

// Route to get report options based on type
router.get(
  '/options',
  requirePermission('view_reports'),
  validateQuery({
    search: { 
      validator: 'string', 
      required: false,
      options: { minLength: 1, maxLength: 100, allowSpecialChars: false }
    },
    disaster_search: { 
      validator: 'string', 
      required: false,
      options: { minLength: 1, maxLength: 100, allowSpecialChars: false }
    },
    barangay_limit: { 
      validator: 'numeric', 
      required: false,
      options: { min: 1, max: 1000 }
    },
    disaster_limit: { 
      validator: 'numeric', 
      required: false,
      options: { min: 1, max: 1000 }
    },
    status: { 
      validator: 'string', 
      required: false,
      options: { minLength: 3, maxLength: 10, allowSpecialChars: false }
    }
  }),
  reportsController.getReportOptions
);

module.exports = router;

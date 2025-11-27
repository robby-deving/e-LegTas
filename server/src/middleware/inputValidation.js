/**
 * Input validation middleware
 * Provides reusable validation middleware for common input patterns
 */

const {
  validateEmail,
  validateEmployeeNumber,
  validatePassword,
  validateId,
  validateOTP,
  validateString,
  validateNumeric,
  validateBoolean,
  validateAddress,
  validateArray
} = require('../utils/validateInput');
const logger = require('../utils/logger');

/**
 * Validates request body fields based on provided schema
 * @param {Object} schema - Object defining validation rules for each field
 * @returns {Function} Express middleware function
 * 
 * Example usage:
 * router.post('/endpoint', validateBody({
 *   email: { validator: 'email', required: true },
 *   age: { validator: 'numeric', required: false, options: { min: 0, max: 120 } }
 * }), handler);
 */
function validateBody(schema) {
  return (req, res, next) => {
    const errors = [];
    const sanitized = {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];
      logger.info(value)

      // Check if required field is missing
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }

      // Skip validation if field is not required and not provided
      if (!rules.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      // Apply validator
      let validation;
      switch (rules.validator) {
        case 'email':
          validation = validateEmail(value);
          break;
        case 'employeeNumber':
          validation = validateEmployeeNumber(value);
          break;
        case 'password':
          validation = validatePassword(value);
          break;
        case 'otp':
          validation = validateOTP(value);
          break;
        case 'uuid':
          validation = validateId(value, 'uuid');
          break;
        case 'id':
        case 'integer':
          validation = validateId(value, 'integer');
          break;
        case 'string':
          validation = validateString(value, rules.options || {});
          break;
        case 'numeric':
          validation = validateNumeric(value, rules.options || {});
          break;
        case 'boolean':
          validation = validateBoolean(value);
          break;
        case 'address':
          validation = validateAddress(value);
          break;
        case 'array':
          validation = validateArray(value, rules.options || {});
          break;
        case 'custom':
          if (typeof rules.customValidator === 'function') {
            validation = rules.customValidator(value);
          } else {
            validation = { isValid: false, error: 'Invalid custom validator' };
          }
          break;
        default:
          validation = { isValid: false, error: `Unknown validator type: ${rules.validator}` };
      }

      if (!validation.isValid) {
        errors.push(`${field}: ${validation.error}`);
      } else if (validation.sanitized !== undefined) {
        sanitized[field] = validation.sanitized;
      }
    }

    if (errors.length > 0) {
      logger.warn('Input validation failed', { 
        path: req.path, 
        errors,
        ip: req.ip 
      });
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors 
      });
    }

    // Attach sanitized data to request
    req.validatedBody = sanitized;
    next();
  };
}

/**
 * Validates query parameters
 * @param {Object} schema - Object defining validation rules for each query param
 * @returns {Function} Express middleware function
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const errors = [];
    const sanitized = {};

    for (const [param, rules] of Object.entries(schema)) {
      const value = req.query[param];

      // Check if required parameter is missing
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${param} query parameter is required`);
        continue;
      }

      // Skip validation if parameter is not required and not provided
      if (!rules.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      // Apply validator
      let validation;
      switch (rules.validator) {
        case 'uuid':
          validation = validateId(value, 'uuid');
          break;
        case 'id':
        case 'integer':
          validation = validateId(value, 'integer');
          break;
        case 'string':
          validation = validateString(value, rules.options || {});
          break;
        case 'numeric':
          validation = validateNumeric(value, rules.options || {});
          break;
        case 'boolean':
          validation = validateBoolean(value);
          break;
        case 'address':
          validation = validateAddress(value);
          break;
        default:
          validation = { isValid: false, error: `Unknown validator type: ${rules.validator}` };
      }

      if (!validation.isValid) {
        errors.push(`${param}: ${validation.error}`);
      } else if (validation.sanitized !== undefined) {
        sanitized[param] = validation.sanitized;
      }
    }

    if (errors.length > 0) {
      logger.warn('Query parameter validation failed', { 
        path: req.path, 
        errors,
        ip: req.ip 
      });
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors 
      });
    }

    // Attach sanitized data to request
    req.validatedQuery = sanitized;
    next();
  };
}

/**
 * Validates URL parameters (like :id in routes)
 * @param {Object} schema - Object defining validation rules for each param
 * @returns {Function} Express middleware function
 */
function validateParams(schema) {
  return (req, res, next) => {
    const errors = [];
    const sanitized = {};

    for (const [param, rules] of Object.entries(schema)) {
      const value = req.params[param];

      // URL params are always required
      if (value === undefined || value === null || value === '') {
        errors.push(`${param} parameter is required`);
        continue;
      }

      // Apply validator
      let validation;
      switch (rules.validator) {
        case 'uuid':
          validation = validateId(value, 'uuid');
          break;
        case 'id':
        case 'integer':
          validation = validateId(value, 'integer');
          break;
        case 'string':
          validation = validateString(value, rules.options || {});
          break;
        default:
          validation = { isValid: false, error: `Unknown validator type: ${rules.validator}` };
      }

      if (!validation.isValid) {
        errors.push(`${param}: ${validation.error}`);
      } else if (validation.sanitized !== undefined) {
        sanitized[param] = validation.sanitized;
      }
    }

    if (errors.length > 0) {
      logger.warn('URL parameter validation failed', { 
        path: req.path, 
        errors,
        ip: req.ip 
      });
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors 
      });
    }

    // Attach sanitized data to request
    req.validatedParams = sanitized;
    next();
  };
}

module.exports = {
  validateBody,
  validateQuery,
  validateParams
};


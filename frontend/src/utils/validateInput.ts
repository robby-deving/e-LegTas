/**
 * Input validation utilities to prevent SQL injection and other security vulnerabilities
 * These functions validate input patterns and sanitize potentially dangerous content
 */


/**
 * Validates and sanitizes string input for general use
 * Removes potentially dangerous characters and validates length
 */
export function validateString(input: string, options: {
  minLength?: number;
  maxLength?: number;
  allowSpecialChars?: boolean;
} = {}): { isValid: boolean; sanitized?: string; error?: string } {
  const { minLength = 1, maxLength = 255, allowSpecialChars = false } = options;

  if (!input || typeof input !== 'string') {
    return { isValid: false, error: 'Input must be a non-empty string' };
  }

  const trimmed = input.trim();
  
  if (trimmed.length < minLength) {
    return { isValid: false, error: `Input must be at least ${minLength} characters long` };
  }

  if (trimmed.length > maxLength) {
    return { isValid: false, error: `Input must not exceed ${maxLength} characters` };
  }

  // Check for SQL injection patterns
  const sqlInjectionPatterns = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
    /(-{2}|\/\*|\*\/)/, // SQL comments
    /('|(\\x27)|(\\x2D\\x2D)|(\\x2F\\x2A)|(\\x2A\\x2F))/i, // Quotes and comment markers
    /(<script|javascript:|vbscript:|onload=|onerror=)/i, // XSS patterns
  ];

  for (const pattern of sqlInjectionPatterns) {
    if (pattern.test(trimmed)) {
      return { isValid: false, error: 'Input contains potentially dangerous characters' };
    }
  }

  let sanitized = trimmed;

  if (!allowSpecialChars) {
    // Remove special characters that could be used in SQL injection
    sanitized = sanitized.replace(/[<>'"&\\]/g, '');
  }

  return { isValid: true, sanitized };
}

/**
 * Validates email addresses using native regex
 */
export function validateEmail(email: string): { isValid: boolean; sanitized?: string; error?: string } {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email must be a string' };
  }

  const trimmed = email.trim().toLowerCase();
  
  // RFC 5322 compliant email regex (simplified version)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  // Additional SQL injection check for email
  const stringValidation = validateString(trimmed, { minLength: 5, maxLength: 254 });
  if (!stringValidation.isValid) {
    return stringValidation;
  }

  return { isValid: true, sanitized: trimmed };
}

/**
 * Validates numeric input (for IDs, quantities, etc.)
 */
export function validateNumeric(input: any, options: {
  min?: number;
  max?: number;
  allowDecimals?: boolean;
} = {}): { isValid: boolean; sanitized?: number; error?: string } {
  const { min, max, allowDecimals = false } = options;

  if (input === null || input === undefined || input === '') {
    return { isValid: false, error: 'Input cannot be null, undefined, or empty' };
  }

  const num = allowDecimals ? parseFloat(input) : parseInt(input, 10);

  if (isNaN(num)) {
    return { isValid: false, error: 'Input must be a valid number' };
  }

  if (min !== undefined && num < min) {
    return { isValid: false, error: `Number must be at least ${min}` };
  }

  if (max !== undefined && num > max) {
    return { isValid: false, error: `Number must not exceed ${max}` };
  }

  // Check for potential SQL injection in string representation
  if (typeof input === 'string') {
    const stringValidation = validateString(input, { allowSpecialChars: false });
    if (!stringValidation.isValid) {
      return { isValid: false, error: 'Invalid numeric input format' };
    }
  }

  return { isValid: true, sanitized: num };
}

/**
 * Validates ID parameters (UUID, integer IDs, etc.)
 */
export function validateId(id: string | number, type: 'uuid' | 'integer' | 'string' = 'integer'): { isValid: boolean; sanitized?: string | number; error?: string } {
  if (!id) {
    return { isValid: false, error: 'ID cannot be null or empty' };
  }

  switch (type) {
    case 'uuid':
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (typeof id !== 'string' || !uuidRegex.test(id)) {
        return { isValid: false, error: 'Invalid UUID format' };
      }
      return { isValid: true, sanitized: id };

    case 'integer':
      return validateNumeric(id, { min: 1 });

    case 'string':
      return validateString(id.toString(), { minLength: 1, maxLength: 100, allowSpecialChars: false });

    default:
      return { isValid: false, error: 'Invalid ID type specified' };
  }
}

/**
 * Validates search queries and filters
 */
export function validateSearchQuery(query: string, options: {
  maxLength?: number;
  allowWildcards?: boolean;
} = {}): { isValid: boolean; sanitized?: string; error?: string } {
  const { maxLength = 100, allowWildcards = false } = options;

  const stringValidation = validateString(query, { maxLength, allowSpecialChars: allowWildcards });
  if (!stringValidation.isValid) {
    return stringValidation;
  }

  // Additional validation for search queries
  const sanitized = stringValidation.sanitized!;

  // Remove SQL operators that shouldn't be in search queries
  const dangerousOperators = /(\b(and|or|not|like|between|in|exists|any|all)\b|=|>|<|>=|<=|!=|<>)|(\|{2}|&{2})/i;
  
  if (dangerousOperators.test(sanitized)) {
    return { isValid: false, error: 'Search query contains invalid operators' };
  }

  return { isValid: true, sanitized };
}

/**
 * Validates date inputs using native Date parsing
 */
export function validateDate(date: string): { isValid: boolean; sanitized?: string; error?: string } {
  if (!date || typeof date !== 'string') {
    return { isValid: false, error: 'Date must be a string' };
  }

  const trimmed = date.trim();

  // Try to parse as ISO date
  const parsedDate = new Date(trimmed);
  if (isNaN(parsedDate.getTime())) {
    return { isValid: false, error: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)' };
  }

  // Additional security check
  const stringValidation = validateString(trimmed, { allowSpecialChars: true });
  if (!stringValidation.isValid) {
    return stringValidation;
  }

  return { isValid: true, sanitized: trimmed };
}

/**
 * Validates boolean inputs
 */
export function validateBoolean(input: any): { isValid: boolean; sanitized?: boolean; error?: string } {
  if (input === null || input === undefined) {
    return { isValid: false, error: 'Boolean input cannot be null or undefined' };
  }

  if (typeof input === 'boolean') {
    return { isValid: true, sanitized: input };
  }

  if (typeof input === 'string') {
    const lower = input.toLowerCase().trim();
    if (lower === 'true' || lower === '1') {
      return { isValid: true, sanitized: true };
    }
    if (lower === 'false' || lower === '0') {
      return { isValid: true, sanitized: false };
    }
  }

  if (typeof input === 'number') {
    if (input === 1) return { isValid: true, sanitized: true };
    if (input === 0) return { isValid: true, sanitized: false };
  }

  return { isValid: false, error: 'Invalid boolean value' };
}

/**
 * Validates array inputs
 */
export function validateArray(input: any[], options: {
  maxLength?: number;
  itemValidator?: (item: any) => { isValid: boolean; error?: string };
} = {}): { isValid: boolean; sanitized?: any[]; error?: string } {
  const { maxLength = 100, itemValidator } = options;

  if (!Array.isArray(input)) {
    return { isValid: false, error: 'Input must be an array' };
  }

  if (input.length > maxLength) {
    return { isValid: false, error: `Array must not exceed ${maxLength} items` };
  }

  if (itemValidator) {
    for (let i = 0; i < input.length; i++) {
      const validation = itemValidator(input[i]);
      if (!validation.isValid) {
        return { isValid: false, error: `Invalid item at index ${i}: ${validation.error}` };
      }
    }
  }

  return { isValid: true, sanitized: input };
}

/**
 * Comprehensive input sanitizer for form data
 */
export function sanitizeFormData(data: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      const validation = validateString(value);
      sanitized[key] = validation.isValid ? validation.sanitized : '';
    } else if (typeof value === 'number') {
      const validation = validateNumeric(value);
      sanitized[key] = validation.isValid ? validation.sanitized : 0;
    } else if (typeof value === 'boolean') {
      const validation = validateBoolean(value);
      sanitized[key] = validation.isValid ? validation.sanitized : false;
    } else if (Array.isArray(value)) {
      const validation = validateArray(value);
      sanitized[key] = validation.isValid ? validation.sanitized : [];
    } else {
      // For complex objects, recursively sanitize if needed
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Validates employee numbers (allows numbers and dashes)
 */
export function validateEmployeeNumber(employeeNumber: string): { isValid: boolean; sanitized?: string; error?: string } {
  if (!employeeNumber || typeof employeeNumber !== 'string') {
    return { isValid: false, error: 'Employee number must be a string' };
  }

  const trimmed = employeeNumber.trim();
  
  // Allow alphanumeric characters and dashes, with reasonable length limits
  const employeeNumberRegex = /^[a-zA-Z0-9-]+$/;
  
  if (!employeeNumberRegex.test(trimmed)) {
    return { isValid: false, error: 'Employee number can only contain letters, numbers, and dashes' };
  }

  // Check length (reasonable limits for employee numbers)
  if (trimmed.length < 1 || trimmed.length > 50) {
    return { isValid: false, error: 'Employee number must be between 1 and 50 characters' };
  }

  // Additional SQL injection check
  const stringValidation = validateString(trimmed, { allowSpecialChars: true });
  if (!stringValidation.isValid) {
    return stringValidation;
  }

  return { isValid: true, sanitized: trimmed };
}

/**
 * Validates password with basic security requirements
 */
export function validatePassword(password: string): { isValid: boolean; sanitized?: string; error?: string } {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password must be a string' };
  }

  const trimmed = password;
  
  // Minimum length requirement
  if (trimmed.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters long' };
  }

  // Maximum length to prevent DoS
  if (trimmed.length > 128) {
    return { isValid: false, error: 'Password must not exceed 128 characters' };
  }

  // Check for basic security (no common weak patterns)
  const weakPatterns = [
    /^password/i,
    /^123456/,
    /^qwerty/i,
    /^admin/i
  ];

  for (const pattern of weakPatterns) {
    if (pattern.test(trimmed)) {
      return { isValid: false, error: 'Password is too weak. Please choose a stronger password.' };
    }
  }

  return { isValid: true, sanitized: trimmed };
}

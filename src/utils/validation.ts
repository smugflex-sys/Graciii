// Validation utilities for form inputs

export interface ValidationErrors {
  [key: string]: string;
}

// Input sanitization utilities
export const sanitizeInput = {
  // Remove HTML tags and special characters
  text: (input: string): string => {
    return input
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>]/g, '') // Remove remaining brackets
      .trim();
  },
  
  // Sanitize names (allow only letters, spaces, hyphens, apostrophes)
  name: (input: string): string => {
    return input
      .replace(/[^a-zA-Z\s\-']/g, '') // Allow only letters, spaces, hyphens, apostrophes
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  },
  
  // Sanitize email
  email: (input: string): string => {
    return input
      .toLowerCase()
      .trim()
      .replace(/[<>]/g, ''); // Remove brackets
  },
  
  // Sanitize phone number
  phone: (input: string): string => {
    return input
      .replace(/[^\d+\s\-\(\)]/g, '') // Allow only numbers, plus, spaces, hyphens, parentheses
      .trim();
  },
  
  // Sanitize numbers
  number: (input: string): string => {
    return input.replace(/[^\d.]/g, '');
  },
  
  // Sanitize alphanumeric
  alphanumeric: (input: string): string => {
    return input.replace(/[^a-zA-Z0-9]/g, '');
  }
};

// Enhanced validation with sanitization
export const validateAndSanitize = {
  student: (data: any): { sanitized: any; errors: ValidationErrors } => {
    const sanitized = { ...data };
    const errors: ValidationErrors = {};
    
    // Sanitize first name
    if (sanitized.firstName) {
      sanitized.firstName = sanitizeInput.name(sanitized.firstName);
      if (!sanitized.firstName || sanitized.firstName.length < 2) {
        errors.firstName = 'First name must be at least 2 characters';
      }
    } else {
      errors.firstName = 'First name is required';
    }
    
    // Sanitize last name
    if (sanitized.lastName) {
      sanitized.lastName = sanitizeInput.name(sanitized.lastName);
      if (!sanitized.lastName || sanitized.lastName.length < 2) {
        errors.lastName = 'Last name must be at least 2 characters';
      }
    } else {
      errors.lastName = 'Last name is required';
    }
    
    // Sanitize email
    if (sanitized.email) {
      sanitized.email = sanitizeInput.email(sanitized.email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized.email)) {
        errors.email = 'Please enter a valid email address';
      }
    }
    
    // Sanitize phone
    if (sanitized.phone) {
      sanitized.phone = sanitizeInput.phone(sanitized.phone);
      if (!/^\+?[\d\s\-\(\)]{10,}$/.test(sanitized.phone)) {
        errors.phone = 'Please enter a valid phone number';
      }
    }
    
    return { sanitized, errors };
  },
  
  user: (data: any): { sanitized: any; errors: ValidationErrors } => {
    const sanitized = { ...data };
    const errors: ValidationErrors = {};
    
    // Sanitize name fields
    if (sanitized.firstName) {
      sanitized.firstName = sanitizeInput.name(sanitized.firstName);
      if (!sanitized.firstName || sanitized.firstName.length < 2) {
        errors.firstName = 'First name must be at least 2 characters';
      }
    }
    
    if (sanitized.lastName) {
      sanitized.lastName = sanitizeInput.name(sanitized.lastName);
      if (!sanitized.lastName || sanitized.lastName.length < 2) {
        errors.lastName = 'Last name must be at least 2 characters';
      }
    }
    
    // Sanitize email (required for users)
    if (sanitized.email) {
      sanitized.email = sanitizeInput.email(sanitized.email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized.email)) {
        errors.email = 'Please enter a valid email address';
      }
    } else {
      errors.email = 'Email is required';
    }
    
    // Sanitize phone
    if (sanitized.phone) {
      sanitized.phone = sanitizeInput.phone(sanitized.phone);
    }
    
    return { sanitized, errors };
  }
};

export const validateStudentData = (data: any): ValidationErrors => {
  const errors: ValidationErrors = {};
  
  // First name validation
  if (!data.firstName?.trim() || data.firstName.length < 2) {
    errors.firstName = 'First name must be at least 2 characters';
  }
  if (!/^[a-zA-Z\s]+$/.test(data.firstName)) {
    errors.firstName = 'First name can only contain letters';
  }
  
  // Last name validation
  if (!data.lastName?.trim() || data.lastName.length < 2) {
    errors.lastName = 'Last name must be at least 2 characters';
  }
  if (!/^[a-zA-Z\s]+$/.test(data.lastName)) {
    errors.lastName = 'Last name can only contain letters';
  }
  
  // Email validation
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Please enter a valid email address';
  }
  
  // Phone validation
  if (data.phone && !/^\+?[\d\s-()]+$/.test(data.phone)) {
    errors.phone = 'Please enter a valid phone number';
  }
  
  // Date of birth validation
  if (!data.dateOfBirth) {
    errors.dateOfBirth = 'Date of birth is required';
  } else {
    const dob = new Date(data.dateOfBirth);
    const today = new Date();
    const age = Math.floor((today.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    
    if (age < 5 || age > 25) {
      errors.dateOfBirth = 'Student age should be between 5 and 25 years';
    }
  }
  
  // Gender validation
  if (!data.gender) {
    errors.gender = 'Gender is required';
  } else if (!['Male', 'Female'].includes(data.gender)) {
    errors.gender = 'Please select a valid gender';
  }
  
  return errors;
};

export const validateTeacherData = (data: any): ValidationErrors => {
  const errors: ValidationErrors = {};
  
  // First name validation
  if (!data.firstName?.trim() || data.firstName.length < 2) {
    errors.firstName = 'First name must be at least 2 characters';
  }
  if (!/^[a-zA-Z\s]+$/.test(data.firstName)) {
    errors.firstName = 'First name can only contain letters';
  }
  
  // Last name validation
  if (!data.lastName?.trim() || data.lastName.length < 2) {
    errors.lastName = 'Last name must be at least 2 characters';
  }
  if (!/^[a-zA-Z\s]+$/.test(data.lastName)) {
    errors.lastName = 'Last name can only contain letters';
  }
  
  // Email validation
  if (!data.email?.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Please enter a valid email address';
  }
  
  // Phone validation
  if (!data.phone?.trim()) {
    errors.phone = 'Phone number is required';
  } else if (!/^\+?[\d\s-()]+$/.test(data.phone)) {
    errors.phone = 'Please enter a valid phone number';
  }
  
  // Employee ID validation
  if (!data.employeeId?.trim()) {
    errors.employeeId = 'Employee ID is required';
  }
  
  // Qualification validation
  if (!data.qualification?.trim()) {
    errors.qualification = 'Qualification is required';
  }
  
  // Specialization validation
  if (!data.specialization || data.specialization.length === 0) {
    errors.specialization = 'At least one specialization is required';
  }
  
  // Class teacher validation
  if (data.isClassTeacher && !data.classTeacherId) {
    errors.classTeacherId = 'Please select a class for class teacher assignment';
  }
  
  return errors;
};

export const validateParentData = (data: any): ValidationErrors => {
  const errors: ValidationErrors = {};
  
  // First name validation
  if (!data.firstName?.trim() || data.firstName.length < 2) {
    errors.firstName = 'First name must be at least 2 characters';
  }
  if (!/^[a-zA-Z\s]+$/.test(data.firstName)) {
    errors.firstName = 'First name can only contain letters';
  }
  
  // Last name validation
  if (!data.lastName?.trim() || data.lastName.length < 2) {
    errors.lastName = 'Last name must be at least 2 characters';
  }
  if (!/^[a-zA-Z\s]+$/.test(data.lastName)) {
    errors.lastName = 'Last name can only contain letters';
  }
  
  // Email validation
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Please enter a valid email address';
  }
  
  // Phone validation
  if (!data.phone?.trim()) {
    errors.phone = 'Phone number is required';
  } else if (!/^\+?[\d\s-()]+$/.test(data.phone)) {
    errors.phone = 'Please enter a valid phone number';
  }
  
  return errors;
};

export const validateScoreData = (data: any): ValidationErrors => {
  const errors: ValidationErrors = {};
  
  // CA1 validation
  if (data.ca1 === undefined || data.ca1 === '') {
    errors.ca1 = 'CA1 score is required';
  } else if (isNaN(data.ca1) || parseFloat(data.ca1) < 0 || parseFloat(data.ca1) > 20) {
    errors.ca1 = 'CA1 score must be between 0 and 20';
  }
  
  // CA2 validation
  if (data.ca2 === undefined || data.ca2 === '') {
    errors.ca2 = 'CA2 score is required';
  } else if (isNaN(data.ca2) || parseFloat(data.ca2) < 0 || parseFloat(data.ca2) > 20) {
    errors.ca2 = 'CA2 score must be between 0 and 20';
  }
  
  // Exam validation
  if (data.exam === undefined || data.exam === '') {
    errors.exam = 'Exam score is required';
  } else if (isNaN(data.exam) || parseFloat(data.exam) < 0 || parseFloat(data.exam) > 60) {
    errors.exam = 'Exam score must be between 0 and 60';
  }
  
  return errors;
};

export const validatePaymentData = (data: any): ValidationErrors => {
  const errors: ValidationErrors = {};
  
  // Amount validation
  if (!data.amount || parseFloat(data.amount) <= 0) {
    errors.amount = 'Payment amount must be greater than 0';
  }
  
  // Payment method validation
  if (!data.paymentMethod?.trim()) {
    errors.paymentMethod = 'Payment method is required';
  }
  
  // Reference number validation
  if (data.paymentMethod !== 'Cash' && !data.referenceNumber?.trim()) {
    errors.referenceNumber = 'Reference number is required for non-cash payments';
  }
  
  return errors;
};

export const validateUserData = (data: any): ValidationErrors => {
  const errors: ValidationErrors = {};
  
  // Username validation
  if (!data.username?.trim()) {
    errors.username = 'Username is required';
  } else if (data.username.length < 3) {
    errors.username = 'Username must be at least 3 characters';
  } else if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
    errors.username = 'Username can only contain letters, numbers, and underscores';
  }
  
  // Password validation
  if (!data.password?.trim()) {
    errors.password = 'Password is required';
  } else if (data.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }
  
  // Role validation
  if (!data.role?.trim()) {
    errors.role = 'Role is required';
  } else if (!['admin', 'teacher', 'accountant', 'parent'].includes(data.role)) {
    errors.role = 'Please select a valid role';
  }
  
  return errors;
};

// Generic field validator
export const validateField = (value: string, rules: {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}): string | null => {
  if (rules.required && (!value || value.trim() === '')) {
    return 'This field is required';
  }
  
  if (value && rules.minLength && value.length < rules.minLength) {
    return `Minimum length is ${rules.minLength} characters`;
  }
  
  if (value && rules.maxLength && value.length > rules.maxLength) {
    return `Maximum length is ${rules.maxLength} characters`;
  }
  
  if (value && rules.pattern && !rules.pattern.test(value)) {
    return 'Invalid format';
  }
  
  if (value && rules.custom) {
    return rules.custom(value);
  }
  
  return null;
};

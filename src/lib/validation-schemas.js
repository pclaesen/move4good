// src/lib/validation-schemas.js
// Zod validation schemas for API request validation

import { z } from 'zod';

/**
 * Schema for user-charities POST request
 * Validates charity selection array
 */
export const userCharitiesSchema = z.object({
  charityNames: z
    .array(
      z.string()
        .min(1, 'Charity name cannot be empty')
        .max(100, 'Charity name too long')
        .trim()
    )
    .max(10, 'Cannot select more than 10 charities')
    .refine(
      (names) => new Set(names).size === names.length,
      'Duplicate charity names are not allowed'
    ),
});

/**
 * Schema for charity creation/update
 * Validates charity data with XSS protection
 */
export const charitySchema = z.object({
  name: z
    .string()
    .min(1, 'Charity name is required')
    .max(100, 'Charity name too long')
    .trim()
    .refine(
      (name) => !/<[^>]*>/.test(name),
      'Charity name cannot contain HTML tags'
    ),
  description: z
    .string()
    .min(1, 'Charity description is required')
    .max(1000, 'Description too long (max 1000 characters)')
    .trim()
    .refine(
      (desc) => !/<script[^>]*>/.test(desc.toLowerCase()),
      'Description cannot contain script tags'
    ),
  donation_address: z
    .string()
    .min(1, 'Donation address is required')
    .max(500, 'Donation address too long')
    .trim()
    .refine(
      (addr) => {
        // Validate as URL or Ethereum address
        const urlPattern = /^https?:\/\/.+/i;
        const ethPattern = /^0x[a-fA-F0-9]{40}$/;
        return urlPattern.test(addr) || ethPattern.test(addr);
      },
      'Donation address must be a valid URL or Ethereum address'
    ),
});

/**
 * Schema for charity update (partial)
 */
export const charityUpdateSchema = charitySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  'At least one field must be provided for update'
);

/**
 * Helper function to validate request body and return formatted errors
 *
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {Object} data - Data to validate
 * @returns {{ success: boolean, data?: Object, errors?: Array }}
 */
export function validateRequest(schema, data) {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return { success: false, errors: formattedErrors };
    }
    return {
      success: false,
      errors: [{ field: 'unknown', message: 'Validation failed' }]
    };
  }
}

/**
 * Sanitizes HTML content to prevent XSS attacks
 * Removes script tags and dangerous attributes
 *
 * @param {string} input - String to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeHtml(input) {
  if (!input) return '';

  return input
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove data: protocol (can be used for XSS)
    .replace(/data:text\/html/gi, '')
    .trim();
}

/**
 * Validates and sanitizes charity data
 *
 * @param {Object} charityData - Raw charity data
 * @returns {Object} Sanitized charity data
 */
export function sanitizeCharityData(charityData) {
  return {
    name: sanitizeHtml(charityData.name),
    description: sanitizeHtml(charityData.description),
    donation_address: charityData.donation_address?.trim(),
  };
}

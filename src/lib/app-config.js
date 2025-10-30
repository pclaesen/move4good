// src/lib/app-config.js
// Application-wide configuration and constants
// Centralized configuration for easy maintenance and environment-specific overrides

/**
 * Donation configuration
 * Controls how donations are calculated based on activities
 */
export const DONATION_CONFIG = {
  // Default donation rate per kilometer
  RATE_PER_KM: parseFloat(process.env.NEXT_PUBLIC_DONATION_RATE_PER_KM || '2.5'),

  // Currency configuration
  CURRENCY: process.env.NEXT_PUBLIC_CURRENCY || 'USD',
  CURRENCY_SYMBOL: process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$',

  // Minimum and maximum donation amounts (in currency units)
  MIN_DONATION_PER_ACTIVITY: parseFloat(process.env.NEXT_PUBLIC_MIN_DONATION || '0.5'),
  MAX_DONATION_PER_ACTIVITY: parseFloat(process.env.NEXT_PUBLIC_MAX_DONATION || '1000'),

  // Blockchain donation configuration (USDC on Base)
  BLOCKCHAIN_CURRENCY: 'USDC',
  BLOCKCHAIN_NETWORK: 'Base',
  BLOCKCHAIN_DECIMALS: 6, // USDC uses 6 decimals

  // Convert donation amount to blockchain units
  toBlockchainUnits: (amount) => {
    return Math.floor(amount * Math.pow(10, DONATION_CONFIG.BLOCKCHAIN_DECIMALS));
  },

  // Format donation amount for display
  formatAmount: (amount) => {
    return `${DONATION_CONFIG.CURRENCY_SYMBOL}${amount.toFixed(2)}`;
  },

  // Calculate donation for a given distance in meters
  calculateDonation: (distanceInMeters) => {
    const distanceInKm = distanceInMeters / 1000;
    const donation = distanceInKm * DONATION_CONFIG.RATE_PER_KM;

    // Apply min/max constraints
    return Math.max(
      DONATION_CONFIG.MIN_DONATION_PER_ACTIVITY,
      Math.min(donation, DONATION_CONFIG.MAX_DONATION_PER_ACTIVITY)
    );
  }
};

/**
 * Activity configuration
 * Settings related to Strava activities
 */
export const ACTIVITY_CONFIG = {
  // Activity types that qualify for donations
  ELIGIBLE_TYPES: ['Run', 'VirtualRun', 'Walk', 'Hike'],

  // Number of recent activities to display
  RECENT_ACTIVITIES_LIMIT: 5,

  // Maximum activities to fetch from database
  MAX_ACTIVITIES_FETCH: 30,

  // Activity display format
  DATE_FORMAT: 'en-US',
  DATE_OPTIONS: {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }
};

/**
 * Charity configuration
 * Settings for charity selection and management
 */
export const CHARITY_CONFIG = {
  // Maximum number of charities a user can select
  MAX_CHARITIES_PER_USER: 10,

  // Charity name constraints
  MIN_CHARITY_NAME_LENGTH: 1,
  MAX_CHARITY_NAME_LENGTH: 100,

  // Charity description constraints
  MIN_CHARITY_DESC_LENGTH: 1,
  MAX_CHARITY_DESC_LENGTH: 1000,

  // Donation address constraints
  MAX_DONATION_ADDRESS_LENGTH: 500
};

/**
 * Webhook configuration
 * Settings for Strava webhook event processing
 */
export const WEBHOOK_CONFIG = {
  // Maximum time to respond to Strava (milliseconds)
  MAX_RESPONSE_TIME: 2000,

  // Number of days to retain webhook events in database
  EVENT_RETENTION_DAYS: 30,

  // Maximum webhook events to return in API
  MAX_EVENTS_PER_REQUEST: 1000,

  // Default limit for webhook events query
  DEFAULT_EVENTS_LIMIT: 100
};

/**
 * Authentication configuration
 * Settings for session and authentication management
 */
export const AUTH_CONFIG = {
  // Session expiration time (hours)
  SESSION_EXPIRATION_HOURS: 24,

  // Strava OAuth scopes
  STRAVA_SCOPES: 'read,activity:read_all',

  // Token refresh buffer (minutes before expiry to refresh)
  TOKEN_REFRESH_BUFFER_MINUTES: 5
};

/**
 * UI configuration
 * Settings for user interface behavior
 */
export const UI_CONFIG = {
  // Loading spinner delay (ms) before showing
  LOADING_DELAY: 300,

  // Toast notification duration (ms)
  TOAST_DURATION: 5000,

  // Debounce delay for search/filter inputs (ms)
  DEBOUNCE_DELAY: 300,

  // Animation durations
  ANIMATION_DURATION_SHORT: 200,
  ANIMATION_DURATION_MEDIUM: 400,
  ANIMATION_DURATION_LONG: 600
};

/**
 * API configuration
 * Settings for API requests and rate limiting
 */
export const API_CONFIG = {
  // Request timeout (ms)
  REQUEST_TIMEOUT: 30000,

  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,

  // Rate limiting (requests per minute)
  RATE_LIMIT_PER_MINUTE: 60
};

/**
 * Feature flags
 * Toggle features on/off for different environments
 */
export const FEATURE_FLAGS = {
  // Enable blockchain donations
  ENABLE_BLOCKCHAIN_DONATIONS: process.env.NEXT_PUBLIC_ENABLE_BLOCKCHAIN === 'true',

  // Enable webhook event monitoring page
  ENABLE_WEBHOOK_MONITORING: process.env.NEXT_PUBLIC_ENABLE_WEBHOOK_MONITORING === 'true',

  // Enable user-created charities
  ENABLE_USER_CHARITIES: process.env.NEXT_PUBLIC_ENABLE_USER_CHARITIES !== 'false',

  // Enable activity statistics
  ENABLE_ACTIVITY_STATS: true,

  // Enable debug mode
  DEBUG_MODE: process.env.NODE_ENV === 'development'
};

/**
 * Environment information
 * Helper to detect current environment
 */
export const ENV = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test'
};

/**
 * Export all configuration as a single object for convenience
 */
export const APP_CONFIG = {
  DONATION: DONATION_CONFIG,
  ACTIVITY: ACTIVITY_CONFIG,
  CHARITY: CHARITY_CONFIG,
  WEBHOOK: WEBHOOK_CONFIG,
  AUTH: AUTH_CONFIG,
  UI: UI_CONFIG,
  API: API_CONFIG,
  FEATURES: FEATURE_FLAGS,
  ENV
};

export default APP_CONFIG;

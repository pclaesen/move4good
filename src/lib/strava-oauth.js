// src/lib/strava-oauth.js
// Centralized Strava OAuth configuration and URL generation

/**
 * Determines the appropriate redirect URI for Strava OAuth
 * Priority order:
 * 1. NEXT_PUBLIC_STRAVA_REDIRECT_URI (explicit)
 * 2. NEXT_PUBLIC_WEBHOOK_URL (production)
 * 3. window.location.origin (development fallback)
 *
 * @returns {string} The redirect URI for Strava OAuth callback
 */
export function getRedirectUri() {
  // First priority: explicit redirect URI
  if (process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI) {
    return process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI;
  }

  // Second priority: use WEBHOOK_URL (production)
  if (process.env.NEXT_PUBLIC_WEBHOOK_URL) {
    return `${process.env.NEXT_PUBLIC_WEBHOOK_URL}/auth/strava/callback`;
  }

  // Last resort: current origin (development only)
  // This requires window object, so only works in browser context
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/auth/strava/callback`;
  }

  // Fallback for SSR context
  return '/auth/strava/callback';
}

/**
 * Builds the complete Strava OAuth authorization URL
 *
 * @returns {string} The full Strava authorization URL with all parameters
 */
export function buildStravaAuthUrl() {
  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID || 'your_client_id';
  const redirectUri = getRedirectUri();
  const scope = 'read,activity:read_all';

  // Build Strava authorization URL
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    approval_prompt: 'force',
    scope: scope
  });

  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

/**
 * Initiates the Strava OAuth flow by redirecting to Strava authorization page
 * This should be called in response to user action (e.g., button click)
 */
export function initiateStravaOAuth() {
  if (typeof window !== 'undefined') {
    window.location.href = buildStravaAuthUrl();
  }
}

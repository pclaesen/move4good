// src/lib/auth-middleware.js
// Centralized authentication middleware for API routes

import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server';

/**
 * Authenticates a request using dual-layer authentication:
 * 1. Primary: Supabase session (auth_user_id)
 * 2. Fallback: athlete_id from query params or request body
 *
 * @param {Request} request - The Next.js request object
 * @param {Object} options - Optional configuration
 * @param {boolean} options.requireAuth - If true, returns error response when auth fails
 * @param {string} options.selectFields - Fields to select from users table (default: 'id')
 * @returns {Promise<{userData: Object|null, error: Object|null, adminSupabase: Object}>}
 */
export async function authenticateRequest(request, options = {}) {
  const { requireAuth = true, selectFields = 'id' } = options;
  const supabase = await createSupabaseServerClient();
  const adminSupabase = createSupabaseAdminClient();

  let userData = null;

  // Primary authentication: Check Supabase session
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authUser && !authError) {
      // Get user data from users table using auth_user_id
      const { data: userDataFromAuth, error: userError } = await adminSupabase
        .from('users')
        .select(selectFields)
        .eq('auth_user_id', authUser.id)
        .single();

      if (!userError && userDataFromAuth) {
        userData = userDataFromAuth;
      }
    }
  } catch (err) {
    console.error('Supabase auth check failed:', err);
  }

  // Fallback authentication: Check for athlete_id in query parameters or request body
  if (!userData) {
    let athleteId = null;

    // Try to get athlete_id from query params
    try {
      const { searchParams } = new URL(request.url);
      athleteId = searchParams.get('athlete_id');
    } catch (err) {
      console.error('Failed to parse URL:', err);
    }

    // Try to get athlete_id from request body (for POST/PUT/PATCH requests)
    if (!athleteId && request.method !== 'GET') {
      try {
        // Clone the request to read body without consuming it
        const clonedRequest = request.clone();
        const body = await clonedRequest.json();
        athleteId = body.athlete_id;
      } catch (err) {
        // Body might not be JSON or already consumed, ignore
      }
    }

    if (athleteId) {
      const { data: userDataFromId, error: userError } = await adminSupabase
        .from('users')
        .select(selectFields)
        .eq('id', athleteId)
        .single();

      if (!userError && userDataFromId) {
        userData = userDataFromId;
      }
    }
  }

  // Return error if authentication is required but failed
  if (options.requireAuth && !userData) {
    return {
      userData: null,
      error: {
        message: 'Unauthorized',
        status: 401
      },
      adminSupabase
    };
  }

  return {
    userData,
    error: null,
    adminSupabase
  };
}

/**
 * Extracts athlete_id from query parameters
 *
 * @param {Request} request - The Next.js request object
 * @returns {string|null} The athlete_id or null if not found
 */
export function getAthleteIdFromQuery(request) {
  try {
    const { searchParams } = new URL(request.url);
    return searchParams.get('athlete_id');
  } catch (err) {
    console.error('Failed to parse URL:', err);
    return null;
  }
}

/**
 * Extracts athlete_id from request body
 *
 * @param {Object} body - The parsed request body
 * @returns {string|null} The athlete_id or null if not found
 */
export function getAthleteIdFromBody(body) {
  return body?.athlete_id || null;
}

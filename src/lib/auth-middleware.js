// src/lib/auth-middleware.js
// Centralized authentication middleware for API routes

import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server';

/**
 * Authenticates a request using Supabase session only
 * This is a secure authentication method that relies on HTTP-only cookies
 *
 * SECURITY: This middleware no longer accepts athlete_id from query params or request body
 * to prevent session hijacking and unauthorized access.
 *
 * @param {Request} request - The Next.js request object
 * @param {Object} options - Optional configuration
 * @param {boolean} options.requireAuth - If true, returns error response when auth fails (default: true)
 * @param {string} options.selectFields - Fields to select from users table (default: 'id')
 * @returns {Promise<{userData: Object|null, error: Object|null, adminSupabase: Object}>}
 */
export async function authenticateRequest(request, options = {}) {
  const { requireAuth = true, selectFields = 'id' } = options;
  const supabase = await createSupabaseServerClient();
  const adminSupabase = createSupabaseAdminClient();

  let userData = null;

  // Authenticate using Supabase session only
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
      } else if (userError) {
        console.error('Failed to fetch user data:', userError);
      }
    } else if (authError) {
      console.error('Supabase auth check failed:', authError);
    }
  } catch (err) {
    console.error('Authentication error:', err);
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

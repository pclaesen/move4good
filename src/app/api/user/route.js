import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { getValidStravaToken } from '@/lib/strava-token-refresh'

export async function GET(request) {
  try {
    // Use publishable key client for reading user session
    const supabase = await createSupabaseServerClient()
    
    // Use admin client for database operations requiring elevated privileges
    const adminSupabase = createSupabaseAdminClient()
    
    // Get the authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    let userData = null;
    
    if (authUser && !authError) {
      // Primary authentication: Supabase session
      const { data: userDataFromAuth, error: userError } = await adminSupabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .single()

      if (!userError && userDataFromAuth) {
        userData = userDataFromAuth;
      }
    }
    
    // Fallback authentication: Check for athlete_id in query parameters for localStorage users
    if (!userData) {
      const { searchParams } = new URL(request.url)
      const athleteId = searchParams.get('athlete_id')
      
      if (athleteId) {
        const { data: userDataFromId, error: userError } = await adminSupabase
          .from('users')
          .select('*')
          .eq('id', athleteId)
          .single()

        if (!userError && userDataFromId) {
          userData = userDataFromId;
        }
      }
    }

    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get a valid access token (refreshing if necessary)
    const accessToken = await getValidStravaToken(userData)

    // Fetch athlete info from Strava API
    try {
      const athleteResponse = await fetch('https://www.strava.com/api/v3/athlete', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      })

      if (athleteResponse.ok) {
        const athleteData = await athleteResponse.json()
        
        return NextResponse.json({
          id: userData.id,
          auth_user_id: userData.auth_user_id,
          athlete: {
            id: athleteData.id,
            username: athleteData.username,
            firstname: athleteData.firstname,
            lastname: athleteData.lastname,
            city: athleteData.city,
            state: athleteData.state,
            country: athleteData.country,
            profile: athleteData.profile,
            profile_medium: athleteData.profile_medium,
          }
        })
      } else {
        // If Strava API fails, return user data without athlete info
        return NextResponse.json({
          id: userData.id,
          auth_user_id: userData.auth_user_id,
          athlete: {
            id: userData.id,
            firstname: 'Strava User',
            lastname: '',
          }
        })
      }
    } catch (stravaError) {
      console.error('Failed to fetch athlete data:', stravaError)
      
      // Return user data without detailed athlete info
      return NextResponse.json({
        id: userData.id,
        auth_user_id: userData.auth_user_id,
        athlete: {
          id: userData.id,
          firstname: 'Strava User',
          lastname: '',
        }
      })
    }
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
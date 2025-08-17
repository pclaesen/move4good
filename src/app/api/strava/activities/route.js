// src/app/api/strava/activities/route.js
import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server';
import { getValidStravaToken } from '@/lib/strava-token-refresh';

export async function GET(request) {
  try {
    // Use publishable key client for reading user session
    const supabase = await createSupabaseServerClient()
    
    // Use admin client for database operations
    const adminSupabase = createSupabaseAdminClient()
    
    // Get the authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    let userData = null;
    
    if (authUser && !authError) {
      // Primary authentication: Supabase session
      const { data: userDataFromAuth, error: userError } = await adminSupabase
        .from('users')
        .select('id, access_token, refresh_token, token_expires_at')
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
          .select('id, access_token, refresh_token, token_expires_at')
          .eq('id', athleteId)
          .single()

        if (!userError && userDataFromId) {
          userData = userDataFromId;
        }
      }
    }

    if (!userData) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!userData.access_token) {
      return NextResponse.json(
        { error: 'No Strava access token found' },
        { status: 401 }
      );
    }

    // Get a valid access token (refreshing if necessary)
    const accessToken = await getValidStravaToken(userData);
    
    // Fetch activities from Strava API
    const activitiesUrl = 'https://www.strava.com/api/v3/athlete/activities';
    const params = new URLSearchParams({
      page: '1',
      per_page: '30' // Get last 30 activities
    });

    console.log('Fetching activities from Strava API...');

    const response = await fetch(`${activitiesUrl}?${params}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Strava API error:', {
        status: response.status,
        statusText: response.statusText
      });

      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid or expired access token' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch activities from Strava' },
        { status: response.status }
      );
    }

    const activities = await response.json();
    
    // Filter and format the activities
    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      name: activity.name,
      type: activity.type,
      distance: activity.distance, // in meters
      moving_time: activity.moving_time, // in seconds
      elapsed_time: activity.elapsed_time,
      total_elevation_gain: activity.total_elevation_gain,
      start_date: activity.start_date,
      start_date_local: activity.start_date_local,
      timezone: activity.timezone,
      average_speed: activity.average_speed,
      max_speed: activity.max_speed,
      average_heartrate: activity.average_heartrate,
      max_heartrate: activity.max_heartrate,
      location_city: activity.location_city,
      location_state: activity.location_state,
      location_country: activity.location_country,
      kudos_count: activity.kudos_count,
      comment_count: activity.comment_count,
      athlete_count: activity.athlete_count,
      photo_count: activity.photo_count,
      map: activity.map,
      trainer: activity.trainer,
      commute: activity.commute,
      manual: activity.manual,
      private: activity.private,
      visibility: activity.visibility,
      flagged: activity.flagged,
      gear_id: activity.gear_id,
      start_latlng: activity.start_latlng,
      end_latlng: activity.end_latlng,
      achievement_count: activity.achievement_count,
      pr_count: activity.pr_count,
      suffer_score: activity.suffer_score,
    }));

    console.log(`Successfully fetched ${formattedActivities.length} activities`);

    return NextResponse.json(formattedActivities);

  } catch (error) {
    console.error('Error fetching activities:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error while fetching activities',
        details: error.message
      },
      { status: 500 }
    );
  }
}
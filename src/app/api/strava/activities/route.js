// src/app/api/strava/activities/route.js
import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function GET(request) {
  try {
    // Authenticate request using middleware, selecting necessary token fields
    const { userData, error, adminSupabase } = await authenticateRequest(request, {
      selectFields: 'id, access_token, refresh_token, token_expires_at'
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    if (!userData.access_token) {
      return NextResponse.json(
        { error: 'No Strava access token found' },
        { status: 401 }
      );
    }

    // Fetch activities from local database instead of Strava API
    console.log('Fetching activities from local database...');

    const { data: activities, error: activitiesError } = await adminSupabase
      .from('activities')
      .select('*')
      .eq('athlete_id', userData.id)
      .eq('is_deleted', false)
      .order('start_date', { ascending: false })
      .limit(30);

    if (activitiesError) {
      console.error('Database error fetching activities:', activitiesError);
      return NextResponse.json(
        { error: 'Failed to fetch activities from database' },
        { status: 500 }
      );
    }

    // Format activities from database
    const formattedActivities = activities.map(activity => {
      // Use stored activity data if available, otherwise use direct fields
      const activityData = activity.activity_data || {};
      
      return {
        id: activity.id,
        name: activity.name || activityData.name,
        type: activity.type || activityData.type,
        distance: activity.distance || activityData.distance,
        moving_time: activity.moving_time || activityData.moving_time,
        elapsed_time: activityData.elapsed_time,
        total_elevation_gain: activityData.total_elevation_gain,
        start_date: activity.start_date || activityData.start_date,
        start_date_local: activityData.start_date_local,
        timezone: activityData.timezone,
        average_speed: activityData.average_speed,
        max_speed: activityData.max_speed,
        average_heartrate: activityData.average_heartrate,
        max_heartrate: activityData.max_heartrate,
        location_city: activityData.location_city,
        location_state: activityData.location_state,
        location_country: activityData.location_country,
        kudos_count: activityData.kudos_count,
        comment_count: activityData.comment_count,
        athlete_count: activityData.athlete_count,
        photo_count: activityData.photo_count,
        map: activityData.map,
        trainer: activityData.trainer,
        commute: activityData.commute,
        manual: activityData.manual,
        private: activityData.private,
        visibility: activityData.visibility,
        flagged: activityData.flagged,
        gear_id: activityData.gear_id,
        start_latlng: activityData.start_latlng,
        end_latlng: activityData.end_latlng,
        achievement_count: activityData.achievement_count,
        pr_count: activityData.pr_count,
        suffer_score: activityData.suffer_score,
      };
    });

    console.log(`Successfully fetched ${formattedActivities.length} activities from database`);

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
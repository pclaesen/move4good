// src/app/api/strava/activities/route.js
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    
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
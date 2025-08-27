// src/app/api/strava/webhooks/callback/route.js
import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { getValidStravaToken } from '@/lib/strava-token-refresh';

// GET request for webhook validation
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    console.log('Webhook validation request:', { mode, token, challenge });

    // Verify the webhook subscription
    if (mode === 'subscribe' && token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
      console.log('Webhook validation successful');
      
      return NextResponse.json({
        "hub.challenge": challenge
      });
    } else {
      console.error('Webhook validation failed:', { 
        mode, 
        tokenMatch: token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN 
      });
      
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

  } catch (error) {
    console.error('Webhook validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST request for webhook events
export async function POST(request) {
  try {
    const event = await request.json();
    
    console.log('Received webhook event:', event);

    // Respond immediately to Strava (within 2 seconds)
    const response = NextResponse.json({ success: true });

    // Process the event asynchronously
    processWebhookEvent(event).catch(error => {
      console.error('Error processing webhook event:', error);
    });

    return response;

  } catch (error) {
    console.error('Webhook event error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Async function to process webhook events
async function processWebhookEvent(event) {
  const adminSupabase = createSupabaseAdminClient();
  
  try {
    const { 
      object_type, 
      object_id, 
      aspect_type, 
      owner_id, 
      event_time 
    } = event;

    // Only process activity events
    if (object_type !== 'activity') {
      if (object_type === 'athlete' && aspect_type === 'update') {
        console.log('Athlete deauthorization event for athlete:', owner_id);
        // Handle athlete deauthorization by cleaning up data
        await handleAthleteDeauthorization(owner_id);
      }
      return;
    }

    console.log(`Processing ${aspect_type} event for activity ${object_id} by athlete ${owner_id}`);

    // Get user data to fetch activity details
    const { data: userData, error: userError } = await adminSupabase
      .from('users')
      .select('id, access_token, refresh_token, token_expires_at')
      .eq('id', owner_id)
      .single();

    if (userError || !userData) {
      console.error('User not found for athlete:', owner_id, userError);
      return;
    }

    // Handle different event types
    switch (aspect_type) {
      case 'create':
        await handleActivityCreate(object_id, owner_id, userData, event_time);
        break;
      
      case 'update':
        await handleActivityUpdate(object_id, owner_id, userData, event_time);
        break;
        
      case 'delete':
        await handleActivityDelete(object_id, owner_id, event_time);
        break;
        
      default:
        console.log('Unhandled aspect_type:', aspect_type);
    }

  } catch (error) {
    console.error('Error in processWebhookEvent:', error);
  }
}

// Handle new activity creation
async function handleActivityCreate(activityId, athleteId, userData, eventTime) {
  const adminSupabase = createSupabaseAdminClient();
  
  try {
    // Get valid access token
    const accessToken = await getValidStravaToken(userData);
    
    // Fetch activity details from Strava
    const activityResponse = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!activityResponse.ok) {
      console.error('Failed to fetch activity details:', activityResponse.status);
      return;
    }

    const activityData = await activityResponse.json();
    
    // Store activity in database
    const { error: insertError } = await adminSupabase
      .from('activities')
      .insert({
        id: activityId,
        athlete_id: athleteId,
        name: activityData.name,
        type: activityData.type,
        distance: activityData.distance,
        moving_time: activityData.moving_time,
        start_date: activityData.start_date,
        activity_data: activityData,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Failed to insert activity:', insertError);
    } else {
      console.log('Successfully stored new activity:', activityId);
    }

  } catch (error) {
    console.error('Error handling activity create:', error);
  }
}

// Handle activity updates
async function handleActivityUpdate(activityId, athleteId, userData, eventTime) {
  const adminSupabase = createSupabaseAdminClient();
  
  try {
    // Get valid access token
    const accessToken = await getValidStravaToken(userData);
    
    // Fetch updated activity details from Strava
    const activityResponse = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!activityResponse.ok) {
      console.error('Failed to fetch updated activity details:', activityResponse.status);
      return;
    }

    const activityData = await activityResponse.json();
    
    // Update activity in database
    const { error: updateError } = await adminSupabase
      .from('activities')
      .update({
        name: activityData.name,
        type: activityData.type,
        distance: activityData.distance,
        moving_time: activityData.moving_time,
        start_date: activityData.start_date,
        activity_data: activityData,
        updated_at: new Date().toISOString()
      })
      .eq('id', activityId)
      .eq('athlete_id', athleteId);

    if (updateError) {
      console.error('Failed to update activity:', updateError);
    } else {
      console.log('Successfully updated activity:', activityId);
    }

  } catch (error) {
    console.error('Error handling activity update:', error);
  }
}

// Handle activity deletion
async function handleActivityDelete(activityId, athleteId, eventTime) {
  const adminSupabase = createSupabaseAdminClient();
  
  try {
    // Soft delete the activity (preserve for donation history)
    const { error: deleteError } = await adminSupabase
      .from('activities')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', activityId)
      .eq('athlete_id', athleteId);

    if (deleteError) {
      console.error('Failed to delete activity:', deleteError);
    } else {
      console.log('Successfully marked activity as deleted:', activityId);
    }

  } catch (error) {
    console.error('Error handling activity delete:', error);
  }
}

// Handle athlete deauthorization
async function handleAthleteDeauthorization(athleteId) {
  const adminSupabase = createSupabaseAdminClient();
  
  try {
    // Mark all activities as deleted for this athlete
    const { error: activitiesError } = await adminSupabase
      .from('activities')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString()
      })
      .eq('athlete_id', athleteId);

    if (activitiesError) {
      console.error('Failed to delete athlete activities:', activitiesError);
    }

    // Remove access tokens from user record
    const { error: userError } = await adminSupabase
      .from('users')
      .update({
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', athleteId);

    if (userError) {
      console.error('Failed to clean up user tokens:', userError);
    } else {
      console.log('Successfully handled athlete deauthorization:', athleteId);
    }

  } catch (error) {
    console.error('Error handling athlete deauthorization:', error);
  }
}
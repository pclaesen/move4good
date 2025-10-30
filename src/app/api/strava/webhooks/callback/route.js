// src/app/api/strava/webhooks/callback/route.js
import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { getValidStravaToken } from '@/lib/strava-token-refresh';
import webhookDbLogger from '@/lib/webhook-events-db-logger';

// GET request for webhook validation
export async function GET(request) {
  const eventId = await webhookDbLogger.logEvent('validation', {
    url: request.url,
    method: 'GET'
  });

  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    console.log('Webhook validation request:', { mode, token, challenge });

    await webhookDbLogger.updateEventStatus(eventId, 'processing', null, {
      validationParams: { mode, token, challenge },
      hasValidToken: token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN
    });

    // Verify the webhook subscription
    if (mode === 'subscribe' && token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
      console.log('Webhook validation successful');

      await webhookDbLogger.updateEventStatus(eventId, 'success', null, {
        result: 'validation_passed',
        challenge: challenge
      });

      return NextResponse.json({
        "hub.challenge": challenge
      });
    } else {
      console.error('Webhook validation failed:', {
        mode,
        tokenMatch: token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN
      });

      await webhookDbLogger.updateEventStatus(eventId, 'failed', 'Invalid mode or token', {
        result: 'validation_failed',
        reason: mode !== 'subscribe' ? 'invalid_mode' : 'invalid_token'
      });
      
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

  } catch (error) {
    console.error('Webhook validation error:', error);
    await webhookDbLogger.updateEventStatus(eventId, 'error', error.message);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST request for webhook events
export async function POST(request) {
  let eventId;

  try {
    const event = await request.json();

    console.log('Received webhook event:', event);

    // Log the incoming webhook event
    eventId = await webhookDbLogger.logEvent('webhook', event, {
      receivedAt: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      contentType: request.headers.get('content-type')
    });

    // Respond immediately to Strava (within 2 seconds)
    const response = NextResponse.json({ success: true });

    // Process the event asynchronously with logging
    processWebhookEvent(event, eventId).catch(error => {
      console.error('Error processing webhook event:', error);
      webhookDbLogger.updateEventStatus(eventId, 'error', error.message);
    });

    return response;

  } catch (error) {
    console.error('Webhook event error:', error);
    if (eventId) {
      await webhookDbLogger.updateEventStatus(eventId, 'error', error.message);
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Async function to process webhook events
async function processWebhookEvent(event, eventId) {
  const adminSupabase = createSupabaseAdminClient();
  
  try {
    const { 
      object_type, 
      object_id, 
      aspect_type, 
      owner_id, 
      event_time 
    } = event;

    webhookDbLogger.updateEventStatus(eventId, 'processing', null, {
      eventDetails: { object_type, object_id, aspect_type, owner_id, event_time }
    });

    // Only process activity events
    if (object_type !== 'activity') {
      if (object_type === 'athlete' && aspect_type === 'update') {
        console.log('Athlete deauthorization event for athlete:', owner_id);
        webhookDbLogger.updateEventStatus(eventId, 'processing', null, {
          eventType: 'athlete_deauthorization'
        });
        // Handle athlete deauthorization by cleaning up data
        await handleAthleteDeauthorization(owner_id, eventId);
        webhookDbLogger.updateEventStatus(eventId, 'success', null, {
          result: 'athlete_deauthorization_completed'
        });
      } else {
        webhookDbLogger.updateEventStatus(eventId, 'skipped', null, {
          reason: 'non_activity_event',
          objectType: object_type
        });
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

    webhookDbLogger.logDatabaseOperation(eventId, 'fetch_user', userData, userError);

    if (userError || !userData) {
      console.error('User not found for athlete:', owner_id, userError);
      webhookDbLogger.updateEventStatus(eventId, 'failed', 'User not found', {
        athleteId: owner_id,
        userError: userError?.message
      });
      return;
    }

    // Handle different event types
    switch (aspect_type) {
      case 'create':
        await handleActivityCreate(object_id, owner_id, userData, event_time, eventId);
        break;
      
      case 'update':
        await handleActivityUpdate(object_id, owner_id, userData, event_time, eventId);
        break;
        
      case 'delete':
        await handleActivityDelete(object_id, owner_id, event_time, eventId);
        break;
        
      default:
        console.log('Unhandled aspect_type:', aspect_type);
        webhookDbLogger.updateEventStatus(eventId, 'skipped', null, {
          reason: 'unhandled_aspect_type',
          aspectType: aspect_type
        });
    }

  } catch (error) {
    console.error('Error in processWebhookEvent:', error);
    webhookDbLogger.updateEventStatus(eventId, 'error', error.message);
  }
}

// Handle new activity creation
async function handleActivityCreate(activityId, athleteId, userData, eventTime, eventId) {
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
      webhookDbLogger.updateEventStatus(eventId, 'failed', 'Failed to fetch activity from Strava API', {
        stravaApiStatus: activityResponse.status,
        activityId
      });
      return;
    }

    const activityData = await activityResponse.json();
    
    // Log the raw activity data from Strava
    webhookDbLogger.logActivityData(eventId, activityData, 'strava-api');
    
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

    webhookDbLogger.logDatabaseOperation(eventId, 'insert_activity', { activityId }, insertError);

    if (insertError) {
      console.error('Failed to insert activity:', insertError);
      webhookDbLogger.updateEventStatus(eventId, 'failed', 'Database insert failed', {
        insertError: insertError.message,
        activityId
      });
    } else {
      console.log('Successfully stored new activity:', activityId);
      webhookDbLogger.updateEventStatus(eventId, 'success', null, {
        result: 'activity_created',
        activityId,
        activityType: activityData.type,
        activityName: activityData.name,
        distance: activityData.distance
      });
    }

  } catch (error) {
    console.error('Error handling activity create:', error);
    webhookDbLogger.updateEventStatus(eventId, 'error', error.message, {
      operation: 'handleActivityCreate',
      activityId
    });
  }
}

// Handle activity updates
async function handleActivityUpdate(activityId, athleteId, userData, eventTime, eventId) {
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
      webhookDbLogger.updateEventStatus(eventId, 'failed', 'Failed to fetch updated activity from Strava API', {
        stravaApiStatus: activityResponse.status,
        activityId
      });
      return;
    }

    const activityData = await activityResponse.json();
    
    // Log the updated activity data from Strava
    webhookDbLogger.logActivityData(eventId, activityData, 'strava-api-update');
    
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

    webhookDbLogger.logDatabaseOperation(eventId, 'update_activity', { activityId }, updateError);

    if (updateError) {
      console.error('Failed to update activity:', updateError);
      webhookDbLogger.updateEventStatus(eventId, 'failed', 'Database update failed', {
        updateError: updateError.message,
        activityId
      });
    } else {
      console.log('Successfully updated activity:', activityId);
      webhookDbLogger.updateEventStatus(eventId, 'success', null, {
        result: 'activity_updated',
        activityId,
        activityType: activityData.type,
        activityName: activityData.name,
        distance: activityData.distance
      });
    }

  } catch (error) {
    console.error('Error handling activity update:', error);
    webhookDbLogger.updateEventStatus(eventId, 'error', error.message, {
      operation: 'handleActivityUpdate',
      activityId
    });
  }
}

// Handle activity deletion
async function handleActivityDelete(activityId, athleteId, eventTime, eventId) {
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

    webhookDbLogger.logDatabaseOperation(eventId, 'soft_delete_activity', { activityId }, deleteError);

    if (deleteError) {
      console.error('Failed to delete activity:', deleteError);
      webhookDbLogger.updateEventStatus(eventId, 'failed', 'Database soft delete failed', {
        deleteError: deleteError.message,
        activityId
      });
    } else {
      console.log('Successfully marked activity as deleted:', activityId);
      webhookDbLogger.updateEventStatus(eventId, 'success', null, {
        result: 'activity_deleted',
        activityId
      });
    }

  } catch (error) {
    console.error('Error handling activity delete:', error);
    webhookDbLogger.updateEventStatus(eventId, 'error', error.message, {
      operation: 'handleActivityDelete',
      activityId
    });
  }
}

// Handle athlete deauthorization
async function handleAthleteDeauthorization(athleteId, eventId) {
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

    webhookDbLogger.logDatabaseOperation(eventId, 'deauth_delete_activities', { athleteId }, activitiesError);

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

    webhookDbLogger.logDatabaseOperation(eventId, 'deauth_clean_tokens', { athleteId }, userError);

    if (userError) {
      console.error('Failed to clean up user tokens:', userError);
    } else {
      console.log('Successfully handled athlete deauthorization:', athleteId);
    }

  } catch (error) {
    console.error('Error handling athlete deauthorization:', error);
    webhookDbLogger.updateEventStatus(eventId, 'error', error.message, {
      operation: 'handleAthleteDeauthorization',
      athleteId
    });
  }
}
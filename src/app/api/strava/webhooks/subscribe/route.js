// src/app/api/strava/webhooks/subscribe/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Get callback URL from request body or environment variable
    const body = await request.json().catch(() => ({}));
    const callback_url = body.callback_url || `${process.env.NEXT_PUBLIC_WEBHOOK_URL}/api/strava/webhooks/callback`;
    
    if (!callback_url) {
      return NextResponse.json(
        { error: 'callback_url is required and NEXT_PUBLIC_WEBHOOK_URL is not set' },
        { status: 400 }
      );
    }

    // Strava webhook subscription endpoint
    const subscriptionUrl = 'https://www.strava.com/api/v3/push_subscriptions';
    
    const subscriptionData = {
      client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      callback_url: callback_url,
      verify_token: process.env.STRAVA_WEBHOOK_VERIFY_TOKEN
    };

    console.log('Creating Strava webhook subscription...', {
      client_id: subscriptionData.client_id,
      callback_url: subscriptionData.callback_url,
      has_secret: !!subscriptionData.client_secret,
      has_verify_token: !!subscriptionData.verify_token,
      from_env: !body.callback_url
    });

    const response = await fetch(subscriptionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(subscriptionData),
    });

    const responseText = await response.text();
    console.log('Strava webhook subscription response:', responseText);

    if (!response.ok) {
      console.error('Webhook subscription failed:', {
        status: response.status,
        statusText: response.statusText,
        response: responseText
      });
      
      return NextResponse.json(
        { 
          error: 'Failed to create webhook subscription',
          details: responseText,
          status: response.status
        },
        { status: response.status }
      );
    }

    let subscriptionResult;
    try {
      subscriptionResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Strava webhook response:', parseError);
      return NextResponse.json(
        { error: 'Invalid response from Strava API' },
        { status: 500 }
      );
    }

    console.log('Webhook subscription created successfully:', subscriptionResult);

    return NextResponse.json({
      success: true,
      subscription: subscriptionResult
    });

  } catch (error) {
    console.error('Webhook subscription error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error during webhook subscription',
        details: error.message
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get existing webhook subscriptions
    const subscriptionsUrl = 'https://www.strava.com/api/v3/push_subscriptions';
    
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET
    });

    const response = await fetch(`${subscriptionsUrl}?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch webhook subscriptions:', {
        status: response.status,
        statusText: response.statusText
      });
      
      return NextResponse.json(
        { error: 'Failed to fetch webhook subscriptions' },
        { status: response.status }
      );
    }

    const subscriptions = await response.json();
    
    return NextResponse.json({
      subscriptions: subscriptions
    });

  } catch (error) {
    console.error('Error fetching webhook subscriptions:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error while fetching subscriptions',
        details: error.message
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('subscription_id');
    
    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'subscription_id is required' },
        { status: 400 }
      );
    }

    console.log('Deleting webhook subscription:', subscriptionId);

    // Delete webhook subscription from Strava
    const deleteUrl = `https://www.strava.com/api/v3/push_subscriptions/${subscriptionId}`;
    
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET
    });

    const response = await fetch(`${deleteUrl}?${params}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to delete webhook subscription:', {
        status: response.status,
        statusText: response.statusText,
        response: errorText
      });
      
      return NextResponse.json(
        { 
          error: 'Failed to delete webhook subscription',
          details: errorText,
          status: response.status
        },
        { status: response.status }
      );
    }

    console.log('Webhook subscription deleted successfully:', subscriptionId);

    return NextResponse.json({
      success: true,
      subscription_id: subscriptionId
    });

  } catch (error) {
    console.error('Error deleting webhook subscription:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error during webhook subscription deletion',
        details: error.message
      },
      { status: 500 }
    );
  }
}
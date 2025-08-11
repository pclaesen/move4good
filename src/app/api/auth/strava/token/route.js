// src/app/api/auth/strava/token/route.js
import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function POST(request) {
  try {
    const { code, scope } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    // Strava API token exchange
    const tokenUrl = 'https://www.strava.com/oauth/token';
    
    const tokenData = {
      client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
    };

    console.log('Exchanging code for token...', {
      client_id: tokenData.client_id,
      has_secret: !!tokenData.client_secret,
      code_length: code.length
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(tokenData),
    });

    const responseText = await tokenResponse.text();
    console.log('Strava API Response:', responseText);

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        response: responseText
      });
      
      return NextResponse.json(
        { 
          error: 'Failed to exchange authorization code',
          details: responseText,
          status: tokenResponse.status
        },
        { status: tokenResponse.status }
      );
    }

    let tokenResult;
    try {
      tokenResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Strava response:', parseError);
      return NextResponse.json(
        { error: 'Invalid response from Strava API' },
        { status: 500 }
      );
    }

    // Check if Strava returned an error
    if (tokenResult.errors) {
      console.error('Strava API errors:', tokenResult.errors);
      return NextResponse.json(
        { 
          error: 'Strava API error',
          details: tokenResult.errors
        },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!tokenResult.access_token || !tokenResult.athlete) {
      console.error('Missing required fields in Strava response:', tokenResult);
      return NextResponse.json(
        { error: 'Invalid token response from Strava' },
        { status: 500 }
      );
    }

    console.log('Token exchange successful for athlete:', tokenResult.athlete.id);

    // // Upsert user data into Supabase
    // const { error: upsertError } = await supabase
    //   .from('users')
    //   .upsert({
    //     strava_id: tokenResult.athlete.id,
    //     strava_username: tokenResult.athlete.username,
    //     strava_access_token: tokenResult.access_token,
    //     strava_refresh_token: tokenResult.refresh_token,
    //     strava_token_expires_at: tokenResult.expires_at,
    //     first_name: tokenResult.athlete.firstname,
    //     last_name: tokenResult.athlete.lastname,
    //   }, {
    //     onConflict: 'strava_id'
    //   });

    // if (upsertError) {
    //   console.error('Failed to update user in database:', upsertError);
    //   return NextResponse.json(
    //     { error: 'Failed to save user data' },
    //     { status: 500 }
    //   );
    // }

    // Return the complete token data
    return NextResponse.json({
      access_token: tokenResult.access_token,
      refresh_token: tokenResult.refresh_token,
      expires_at: tokenResult.expires_at,
      expires_in: tokenResult.expires_in,
      token_type: tokenResult.token_type,
      scope: tokenResult.scope,
      athlete: {
        id: tokenResult.athlete.id,
        username: tokenResult.athlete.username,
        firstname: tokenResult.athlete.firstname,
        lastname: tokenResult.athlete.lastname,
        city: tokenResult.athlete.city,
        state: tokenResult.athlete.state,
        country: tokenResult.athlete.country,
        profile: tokenResult.athlete.profile,
        profile_medium: tokenResult.athlete.profile_medium,
        created_at: tokenResult.athlete.created_at,
        updated_at: tokenResult.athlete.updated_at,
      }
    });

  } catch (error) {
    console.error('Token exchange error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error during token exchange',
        details: error.message
      },
      { status: 500 }
    );
  }
}
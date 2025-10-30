// src/app/api/auth/strava/token/route.js
import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { createEmbeddedWallet } from '@/lib/embedded-wallet';

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

    // Generate deterministic UUID from Strava athlete ID
    const crypto = require('crypto');
    const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // UUID v4 namespace
    const athleteIdString = tokenResult.athlete.id.toString();
    const hash = crypto.createHash('sha1').update(namespace + athleteIdString).digest();
    
    // Create UUID v5 format
    hash[6] = (hash[6] & 0x0f) | 0x50; // Version 5
    hash[8] = (hash[8] & 0x3f) | 0x80; // Variant bits
    
    const authUserId = [
      hash.subarray(0, 4).toString('hex'),
      hash.subarray(4, 6).toString('hex'),
      hash.subarray(6, 8).toString('hex'),
      hash.subarray(8, 10).toString('hex'),
      hash.subarray(10, 16).toString('hex')
    ].join('-');

    // Check if user already exists in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('auth_user_id')
      .eq('id', tokenResult.athlete.id)
      .single();

    let sessionTokens = null;
    const userEmail = `strava-${tokenResult.athlete.id}@cryptorunner.local`;

    // ALWAYS check if auth user exists in Supabase auth system
    // This handles both new users AND existing users who might not have auth user
    const { data: existingAuthUser } = await supabase.auth.admin.getUserById(authUserId);

    if (!existingAuthUser.user) {
      console.log('Auth user does not exist, creating...');
      // Create auth user if it doesn't exist
      const { error: authError } = await supabase.auth.admin.createUser({
        id: authUserId,
        email: userEmail,
        password: crypto.randomUUID(),
        email_confirm: true,
        user_metadata: {
          strava_athlete_id: tokenResult.athlete.id,
          provider: 'strava'
        }
      });

      if (authError && authError.code !== 'email_exists') {
        console.error('Failed to create auth user:', authError);
        return NextResponse.json(
          { error: 'Failed to create user authentication' },
          { status: 500 }
        );
      }
      console.log('Auth user created successfully');
    } else {
      console.log('Auth user already exists:', existingAuthUser.user.email);
    }

    // Generate a session for the user using admin.generateLink
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_WEBHOOK_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard`
      }
    });

    if (linkError) {
      console.error('Failed to generate session link:', linkError);
      // Return error to client so they know what went wrong
      return NextResponse.json(
        { error: 'Failed to generate authentication session', details: linkError.message },
        { status: 500 }
      );
    }

    if (!linkData || !linkData.properties?.action_link) {
      console.error('Invalid link data returned from generateLink');
      return NextResponse.json(
        { error: 'Invalid authentication response' },
        { status: 500 }
      );
    }

    // Extract token hash from the generated link
    // The link format is: .../auth/confirm?token_hash=xxx&type=magiclink
    const url = new URL(linkData.properties.action_link);
    const tokenHash = url.searchParams.get('token_hash');

    if (!tokenHash) {
      console.error('No token hash in generated link');
      return NextResponse.json(
        { error: 'Failed to generate authentication token' },
        { status: 500 }
      );
    }

    sessionTokens = {
      tokenHash: tokenHash,
      email: userEmail, // Need email for verifyOtp
      type: 'magiclink'
    };

    console.log('Session tokens generated successfully');

    // Calculate token expiration timestamp
    const expiresAt = new Date(Date.now() + (tokenResult.expires_in * 1000));

    // Create embedded wallet address for the user
    console.log('Creating embedded wallet address for user...');
    const walletResult = await createEmbeddedWallet(tokenResult.athlete.id.toString());
    
    if (!walletResult.success) {
      console.error('Failed to create embedded wallet:', walletResult.error);
      return NextResponse.json(
        { error: 'Failed to create user wallet' },
        { status: 500 }
      );
    }

    console.log('Embedded wallet created successfully:', walletResult.walletAddress);

    // Upsert user data into Supabase with auth_user_id, tokens, and wallet address
    const userData = {
      id: tokenResult.athlete.id,
      auth_user_id: authUserId,
      access_token: tokenResult.access_token,
      refresh_token: tokenResult.refresh_token,
      token_expires_at: expiresAt.toISOString(),
      wallet_address: walletResult.walletAddress,
    };

    const { error: upsertError } = await supabase
      .from('users')
      .upsert(userData, {
        onConflict: 'id'
      });

    if (upsertError) {
      console.error('Failed to update user in database:', upsertError);
      return NextResponse.json(
        { error: 'Failed to save user data' },
        { status: 500 }
      );
    }

    // Return success with session tokens for client to establish session
    const baseUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    return NextResponse.json({
      success: true,
      redirectUrl: `${baseUrl}/dashboard`,
      sessionTokens: sessionTokens, // Client will use this to establish session
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
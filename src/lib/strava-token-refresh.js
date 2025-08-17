import { createSupabaseAdminClient } from './supabase-server'

export async function refreshStravaToken(userId, refreshToken) {
  try {
    const tokenUrl = 'https://www.strava.com/oauth/token'
    
    const refreshData = {
      client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }

    console.log('Refreshing Strava token for user:', userId)

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(refreshData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Token refresh failed:', {
        status: response.status,
        statusText: response.statusText,
        response: errorText
      })
      throw new Error(`Token refresh failed: ${response.status}`)
    }

    const tokenResult = await response.json()

    if (tokenResult.errors) {
      console.error('Strava API errors during refresh:', tokenResult.errors)
      throw new Error('Strava API error during token refresh')
    }

    // Calculate new expiration timestamp
    const expiresAt = new Date(Date.now() + (tokenResult.expires_in * 1000))

    // Update tokens in database using admin client
    const adminSupabase = createSupabaseAdminClient()
    const { error: updateError } = await adminSupabase
      .from('users')
      .update({
        access_token: tokenResult.access_token,
        refresh_token: tokenResult.refresh_token,
        token_expires_at: expiresAt.toISOString(),
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Failed to update refreshed tokens:', updateError)
      throw new Error('Failed to save refreshed tokens')
    }

    console.log('Successfully refreshed and updated Strava token for user:', userId)

    return {
      access_token: tokenResult.access_token,
      refresh_token: tokenResult.refresh_token,
      expires_at: expiresAt.toISOString(),
    }
  } catch (error) {
    console.error('Error refreshing Strava token:', error)
    throw error
  }
}

export async function getValidStravaToken(userData) {
  // Check if token is expired (with 5 minute buffer)
  const expiresAt = new Date(userData.token_expires_at)
  const now = new Date()
  const bufferTime = 5 * 60 * 1000 // 5 minutes in milliseconds

  if (expiresAt.getTime() <= now.getTime() + bufferTime) {
    console.log('Strava token expired or expiring soon, refreshing...')
    
    try {
      const refreshedTokens = await refreshStravaToken(userData.id, userData.refresh_token)
      return refreshedTokens.access_token
    } catch (error) {
      console.error('Failed to refresh token:', error)
      throw new Error('Unable to refresh expired Strava token')
    }
  }

  return userData.access_token
}
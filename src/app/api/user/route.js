import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { getValidStravaToken } from '@/lib/strava-token-refresh'

export async function GET(request) {
  try {
    // Authenticate request using middleware, selecting all user fields
    const { userData, error } = await authenticateRequest(request, {
      selectFields: '*'
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: error.status })
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
          wallet_address: userData.wallet_address,
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
          wallet_address: userData.wallet_address,
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
        wallet_address: userData.wallet_address,
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
import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET(request) {
  try {
    const supabase = await createSupabaseServerClient()
    const adminSupabase = createSupabaseAdminClient()
    
    // Get the authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's Strava ID from database
    const { data: userData, error: userError } = await adminSupabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { data, error } = await adminSupabase
      .from('users_charities')
      .select(`
        charity_name,
        charities (
          name,
          description,
          donation_address
        )
      `)
      .eq('user_id', userData.id)
      
    if (error) throw error
    
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const supabase = await createSupabaseServerClient()
    const adminSupabase = createSupabaseAdminClient()
    
    // Get the authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's Strava ID from database
    const { data: userData, error: userError } = await adminSupabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { charityNames } = body
    
    if (!charityNames || !Array.isArray(charityNames)) {
      return NextResponse.json({ 
        error: 'Charity names array is required' 
      }, { status: 400 })
    }

    // First, delete existing selections for this user
    const { error: deleteError } = await adminSupabase
      .from('users_charities')
      .delete()
      .eq('user_id', userData.id)
    
    if (deleteError) throw deleteError

    // Then insert new selections
    if (charityNames.length > 0) {
      const insertData = charityNames.map(charityName => ({
        user_id: userData.id,
        charity_name: charityName
      }))

      const { data, error: insertError } = await adminSupabase
        .from('users_charities')
        .insert(insertData)
        .select()
        
      if (insertError) throw insertError
      
      return NextResponse.json({ data })
    }
    
    return NextResponse.json({ data: [] })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const supabase = await createSupabaseServerClient()
    const adminSupabase = createSupabaseAdminClient()
    
    // Get the authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's Strava ID from database
    const { data: userData, error: userError } = await adminSupabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const charityName = searchParams.get('charityName')

    let query = adminSupabase
      .from('users_charities')
      .delete()
      .eq('user_id', userData.id)

    if (charityName) {
      query = query.eq('charity_name', charityName)
    }

    const { data, error } = await query.select()
      
    if (error) throw error
    
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
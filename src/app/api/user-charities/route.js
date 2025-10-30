import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { userCharitiesSchema, validateRequest } from '@/lib/validation-schemas'

export async function GET(request) {
  try {
    // Authenticate request using middleware
    const { userData, error, adminSupabase } = await authenticateRequest(request)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    const { data, error: dbError } = await adminSupabase
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

    if (dbError) throw dbError
    
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    // Authenticate request using middleware
    const { userData, error, adminSupabase } = await authenticateRequest(request)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    const body = await request.json()

    // Validate request body using Zod schema
    const validation = validateRequest(userCharitiesSchema, body)
    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.errors
      }, { status: 400 })
    }

    const { charityNames } = validation.data

    // First, delete existing selections for this user
    const { error: dbDeleteError } = await adminSupabase
      .from('users_charities')
      .delete()
      .eq('user_id', userData.id)

    if (dbDeleteError) throw dbDeleteError

    // Then insert new selections
    if (charityNames.length > 0) {
      const insertData = charityNames.map(charityName => ({
        user_id: userData.id,
        charity_name: charityName
      }))

      const { data, error: dbInsertError } = await adminSupabase
        .from('users_charities')
        .insert(insertData)
        .select()

      if (dbInsertError) throw dbInsertError
      
      return NextResponse.json({ data })
    }
    
    return NextResponse.json({ data: [] })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    // Authenticate request using middleware
    const { userData, error, adminSupabase } = await authenticateRequest(request)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: error.status })
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

    const { data, error: dbError } = await query.select()

    if (dbError) throw dbError
    
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
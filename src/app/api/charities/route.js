import supabase from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { charitySchema, validateRequest, sanitizeCharityData } from '@/lib/validation-schemas'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('charities')
      .select('*')
      .eq('user_created', false)
      .order('name')
      
    if (error) throw error
    
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    // Require authentication for creating charities
    const { userData, error: authError } = await authenticateRequest(request)

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: authError.status })
    }

    const body = await request.json()

    // Validate request body using Zod schema
    const validation = validateRequest(charitySchema, body)
    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.errors
      }, { status: 400 })
    }

    // Sanitize charity data to prevent XSS
    const sanitizedData = sanitizeCharityData(validation.data)

    const { data, error } = await supabase
      .from('charities')
      .insert([{
        name: sanitizedData.name,
        description: sanitizedData.description,
        donation_address: sanitizedData.donation_address,
        user_created: true
      }])
      .select()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
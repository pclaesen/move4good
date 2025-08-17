import supabase from '@/lib/supabase'
import { NextResponse } from 'next/server'

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
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('charities')
      .insert([{
        name: body.name,
        description: body.description,
        donation_address: body.donationAddress,
        user_created: true
      }])
      .select()
      
    if (error) throw error
    
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
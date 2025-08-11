import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Example query - modify according to your needs
    const { data, error } = await supabase
      .from('users2')
      .select('*')
      
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
      .from('users2')
      .insert([body])
      .select()
      
    if (error) throw error
    
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

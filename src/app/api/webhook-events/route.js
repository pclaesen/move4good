import { NextResponse } from 'next/server';
import webhookLogger from '@/lib/webhook-events-logger';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters for filtering
    const filters = {
      type: searchParams.get('type'),
      athleteId: searchParams.get('athlete_id'),
      status: searchParams.get('status'),
      since: searchParams.get('since'),
      limit: searchParams.get('limit') || '50'
    };

    // Remove null/undefined filters
    Object.keys(filters).forEach(key => {
      if (!filters[key]) delete filters[key];
    });

    const events = webhookLogger.getEvents(filters);
    const stats = webhookLogger.getStats();

    return NextResponse.json({
      events,
      stats,
      filters: filters,
      totalEvents: events.length
    });

  } catch (error) {
    console.error('Error fetching webhook events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhook events', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const clearedCount = webhookLogger.clearEvents();
    
    return NextResponse.json({
      success: true,
      message: `Cleared ${clearedCount} webhook events from memory`
    });

  } catch (error) {
    console.error('Error clearing webhook events:', error);
    return NextResponse.json(
      { error: 'Failed to clear webhook events', details: error.message },
      { status: 500 }
    );
  }
}
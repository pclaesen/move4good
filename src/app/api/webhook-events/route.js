import { NextResponse } from 'next/server';
import webhookDbLogger from '@/lib/webhook-events-db-logger';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters for filtering
    const filters = {
      type: searchParams.get('type'),
      athleteId: searchParams.get('athlete_id'),
      status: searchParams.get('status'),
      since: searchParams.get('since'),
      limit: parseInt(searchParams.get('limit') || '100')
    };

    // Remove null/undefined filters
    Object.keys(filters).forEach(key => {
      if (!filters[key]) delete filters[key];
    });

    // Fetch events and stats from database
    const events = await webhookDbLogger.getEvents(filters);
    const stats = await webhookDbLogger.getStats();

    return NextResponse.json({
      events,
      stats,
      filters: filters,
      totalEvents: events.length,
      source: 'database' // Indicate data source
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
    const { searchParams } = new URL(request.url);
    const daysToKeep = parseInt(searchParams.get('days_to_keep') || '30');

    // Clear old events from database
    const clearedCount = await webhookDbLogger.clearOldEvents(daysToKeep);

    return NextResponse.json({
      success: true,
      message: `Cleared ${clearedCount} webhook events older than ${daysToKeep} days from database`,
      clearedCount,
      daysToKeep
    });

  } catch (error) {
    console.error('Error clearing webhook events:', error);
    return NextResponse.json(
      { error: 'Failed to clear webhook events', details: error.message },
      { status: 500 }
    );
  }
}
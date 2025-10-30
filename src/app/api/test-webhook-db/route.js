// src/app/api/test-webhook-db/route.js
// Test endpoint to verify webhook database logging is working
// DELETE THIS FILE after confirming everything works

import { NextResponse } from 'next/server';
import webhookDbLogger from '@/lib/webhook-events-db-logger';

export async function GET(request) {
  const results = {
    timestamp: new Date().toISOString(),
    tests: []
  };

  try {
    // Test 1: Log a test event
    results.tests.push({
      name: 'Create test webhook event',
      status: 'running'
    });

    const testEventId = await webhookDbLogger.logEvent('test', {
      test: true,
      timestamp: Date.now(),
      message: 'Database connectivity test'
    }, {
      source: 'test-endpoint',
      environment: process.env.NODE_ENV
    });

    results.tests[0].status = 'success';
    results.tests[0].eventId = testEventId;

    // Test 2: Update the event status
    results.tests.push({
      name: 'Update event status',
      status: 'running'
    });

    await webhookDbLogger.updateEventStatus(testEventId, 'success', null, {
      testCompleted: true
    });

    results.tests[1].status = 'success';

    // Test 3: Retrieve the event
    results.tests.push({
      name: 'Retrieve event by ID',
      status: 'running'
    });

    const retrievedEvent = await webhookDbLogger.getEventById(testEventId);

    if (retrievedEvent && retrievedEvent.id === testEventId) {
      results.tests[2].status = 'success';
      results.tests[2].event = retrievedEvent;
    } else {
      results.tests[2].status = 'failed';
      results.tests[2].error = 'Event not found or ID mismatch';
    }

    // Test 4: Get stats
    results.tests.push({
      name: 'Get webhook statistics',
      status: 'running'
    });

    const stats = await webhookDbLogger.getStats();
    results.tests[3].status = 'success';
    results.tests[3].stats = stats;

    // Test 5: Query recent events
    results.tests.push({
      name: 'Query recent events',
      status: 'running'
    });

    const events = await webhookDbLogger.getEvents({ limit: 5 });
    results.tests[4].status = 'success';
    results.tests[4].eventCount = events.length;

    // Clean up: Delete test event
    results.tests.push({
      name: 'Clean up test data',
      status: 'running'
    });

    const { error: deleteError } = await webhookDbLogger.supabase
      .from('webhook_events')
      .delete()
      .eq('id', testEventId);

    if (deleteError) {
      results.tests[5].status = 'warning';
      results.tests[5].error = 'Could not delete test event: ' + deleteError.message;
    } else {
      results.tests[5].status = 'success';
    }

    // Overall result
    const allPassed = results.tests.every(test =>
      test.status === 'success' || test.status === 'warning'
    );

    results.overall = allPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌';
    results.summary = {
      total: results.tests.length,
      passed: results.tests.filter(t => t.status === 'success').length,
      failed: results.tests.filter(t => t.status === 'failed').length,
      warnings: results.tests.filter(t => t.status === 'warning').length
    };

    return NextResponse.json(results, {
      status: allPassed ? 200 : 500
    });

  } catch (error) {
    console.error('Test endpoint error:', error);

    results.overall = 'ERROR ❌';
    results.error = {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };

    return NextResponse.json(results, { status: 500 });
  }
}

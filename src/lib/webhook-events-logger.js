// In-memory webhook events logger for debugging and monitoring
// Events are stored only in memory and cleared on server restart

class WebhookEventsLogger {
  constructor() {
    this.events = [];
    this.maxEvents = 100; // Keep last 100 events to prevent memory issues
  }

  logEvent(type, data, metadata = {}) {
    const event = {
      id: this.generateId(),
      type,
      timestamp: new Date().toISOString(),
      data,
      metadata,
      processing: {
        startTime: Date.now(),
        endTime: null,
        duration: null,
        status: 'processing',
        error: null
      }
    };

    // Add to beginning of array (most recent first)
    this.events.unshift(event);
    
    // Keep only maxEvents
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }

    console.log(`📥 Webhook event logged: ${type} (ID: ${event.id})`);
    return event.id;
  }

  updateEventStatus(eventId, status, error = null, additionalData = {}) {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return;

    event.processing.endTime = Date.now();
    event.processing.duration = event.processing.endTime - event.processing.startTime;
    event.processing.status = status;
    event.processing.error = error;

    // Add any additional data (like activity details, database results, etc.)
    Object.assign(event.metadata, additionalData);

    console.log(`📝 Event ${eventId} status updated: ${status} (${event.processing.duration}ms)`);
  }

  logActivityData(eventId, activityData, source = 'strava-api') {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return;

    if (!event.metadata.activities) {
      event.metadata.activities = {};
    }

    event.metadata.activities[source] = {
      timestamp: new Date().toISOString(),
      data: activityData
    };

    console.log(`🏃‍♀️ Activity data logged for event ${eventId} from ${source}`);
  }

  logDatabaseOperation(eventId, operation, result, error = null) {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return;

    if (!event.metadata.database) {
      event.metadata.database = [];
    }

    event.metadata.database.push({
      timestamp: new Date().toISOString(),
      operation,
      result,
      error,
      success: !error
    });

    console.log(`🗄️ Database operation logged for event ${eventId}: ${operation}`);
  }

  getEvents(filters = {}) {
    let filteredEvents = [...this.events];

    // Filter by event type
    if (filters.type) {
      filteredEvents = filteredEvents.filter(e => e.type === filters.type);
    }

    // Filter by athlete ID
    if (filters.athleteId) {
      filteredEvents = filteredEvents.filter(e => 
        e.data?.owner_id === parseInt(filters.athleteId)
      );
    }

    // Filter by status
    if (filters.status) {
      filteredEvents = filteredEvents.filter(e => e.processing.status === filters.status);
    }

    // Filter by time range
    if (filters.since) {
      const sinceDate = new Date(filters.since);
      filteredEvents = filteredEvents.filter(e => 
        new Date(e.timestamp) >= sinceDate
      );
    }

    // Limit results
    if (filters.limit) {
      filteredEvents = filteredEvents.slice(0, parseInt(filters.limit));
    }

    return filteredEvents;
  }

  getEventById(eventId) {
    return this.events.find(e => e.id === eventId);
  }

  getStats() {
    const total = this.events.length;
    const byType = {};
    const byStatus = {};
    let totalProcessingTime = 0;
    let processedCount = 0;

    this.events.forEach(event => {
      // Count by type
      byType[event.type] = (byType[event.type] || 0) + 1;

      // Count by status
      byStatus[event.processing.status] = (byStatus[event.processing.status] || 0) + 1;

      // Calculate average processing time
      if (event.processing.duration) {
        totalProcessingTime += event.processing.duration;
        processedCount++;
      }
    });

    return {
      total,
      byType,
      byStatus,
      averageProcessingTime: processedCount > 0 ? Math.round(totalProcessingTime / processedCount) : 0,
      oldestEvent: this.events.length > 0 ? this.events[this.events.length - 1].timestamp : null,
      newestEvent: this.events.length > 0 ? this.events[0].timestamp : null
    };
  }

  clearEvents() {
    const count = this.events.length;
    this.events = [];
    console.log(`🧹 Cleared ${count} webhook events from memory`);
    return count;
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Create singleton instance
const webhookLogger = new WebhookEventsLogger();

export default webhookLogger;
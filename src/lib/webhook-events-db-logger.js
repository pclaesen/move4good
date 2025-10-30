// src/lib/webhook-events-db-logger.js
// Database-backed webhook events logger for production-ready persistence
// Replaces in-memory webhook-events-logger.js

import { createSupabaseAdminClient } from '@/lib/supabase-server';

/**
 * Database-backed webhook events logger
 * Persists all webhook events to PostgreSQL for debugging and monitoring
 */
class WebhookEventsDbLogger {
  constructor() {
    this.supabase = createSupabaseAdminClient();
  }

  /**
   * Logs a new webhook event to the database
   *
   * @param {string} type - Event type (validation, webhook, etc.)
   * @param {Object} data - Event data payload
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<string>} Event ID
   */
  async logEvent(type, data, metadata = {}) {
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

    try {
      const { error } = await this.supabase
        .from('webhook_events')
        .insert([event]);

      if (error) {
        console.error('Failed to insert webhook event:', error);
        // Don't throw - webhook processing should continue even if logging fails
      } else {
        console.log(`📥 Webhook event logged to database: ${type} (ID: ${event.id})`);
      }
    } catch (err) {
      console.error('Exception logging webhook event:', err);
    }

    return event.id;
  }

  /**
   * Updates the processing status of an event
   *
   * @param {string} eventId - Event ID to update
   * @param {string} status - New status (processing, success, failed, skipped, error)
   * @param {string|null} error - Error message if any
   * @param {Object} additionalData - Additional data to merge into metadata
   */
  async updateEventStatus(eventId, status, error = null, additionalData = {}) {
    try {
      // Fetch current event to calculate duration and merge metadata
      const { data: currentEvent, error: fetchError } = await this.supabase
        .from('webhook_events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (fetchError || !currentEvent) {
        console.error(`Event ${eventId} not found for update`);
        return;
      }

      const endTime = Date.now();
      const duration = endTime - (currentEvent.processing?.startTime || endTime);

      const updatedProcessing = {
        ...currentEvent.processing,
        endTime,
        duration,
        status,
        error
      };

      const updatedMetadata = {
        ...currentEvent.metadata,
        ...additionalData
      };

      const { error: updateError } = await this.supabase
        .from('webhook_events')
        .update({
          processing: updatedProcessing,
          metadata: updatedMetadata
        })
        .eq('id', eventId);

      if (updateError) {
        console.error(`Failed to update event ${eventId}:`, updateError);
      } else {
        console.log(`📝 Event ${eventId} status updated: ${status} (${duration}ms)`);
      }
    } catch (err) {
      console.error(`Exception updating event ${eventId}:`, err);
    }
  }

  /**
   * Logs activity data from Strava API
   *
   * @param {string} eventId - Event ID to update
   * @param {Object} activityData - Activity data from Strava
   * @param {string} source - Source of activity data (e.g., 'strava-api')
   */
  async logActivityData(eventId, activityData, source = 'strava-api') {
    try {
      const { data: currentEvent, error: fetchError } = await this.supabase
        .from('webhook_events')
        .select('metadata')
        .eq('id', eventId)
        .single();

      if (fetchError || !currentEvent) {
        console.error(`Event ${eventId} not found for activity data logging`);
        return;
      }

      const activities = currentEvent.metadata?.activities || {};
      activities[source] = {
        timestamp: new Date().toISOString(),
        data: activityData
      };

      const { error: updateError } = await this.supabase
        .from('webhook_events')
        .update({
          metadata: {
            ...currentEvent.metadata,
            activities
          }
        })
        .eq('id', eventId);

      if (updateError) {
        console.error(`Failed to log activity data for event ${eventId}:`, updateError);
      } else {
        console.log(`🏃‍♀️ Activity data logged for event ${eventId} from ${source}`);
      }
    } catch (err) {
      console.error(`Exception logging activity data for event ${eventId}:`, err);
    }
  }

  /**
   * Logs database operation results
   *
   * @param {string} eventId - Event ID to update
   * @param {string} operation - Operation name (e.g., 'insert_activity')
   * @param {Object} result - Operation result
   * @param {Object|null} error - Error object if any
   */
  async logDatabaseOperation(eventId, operation, result, error = null) {
    try {
      const { data: currentEvent, error: fetchError } = await this.supabase
        .from('webhook_events')
        .select('metadata')
        .eq('id', eventId)
        .single();

      if (fetchError || !currentEvent) {
        console.error(`Event ${eventId} not found for database operation logging`);
        return;
      }

      const database = currentEvent.metadata?.database || [];
      database.push({
        timestamp: new Date().toISOString(),
        operation,
        result,
        error,
        success: !error
      });

      const { error: updateError } = await this.supabase
        .from('webhook_events')
        .update({
          metadata: {
            ...currentEvent.metadata,
            database
          }
        })
        .eq('id', eventId);

      if (updateError) {
        console.error(`Failed to log database operation for event ${eventId}:`, updateError);
      } else {
        console.log(`🗄️ Database operation logged for event ${eventId}: ${operation}`);
      }
    } catch (err) {
      console.error(`Exception logging database operation for event ${eventId}:`, err);
    }
  }

  /**
   * Retrieves events from database with optional filtering
   *
   * @param {Object} filters - Filter options
   * @param {string} filters.type - Filter by event type
   * @param {string} filters.athleteId - Filter by athlete ID
   * @param {string} filters.status - Filter by processing status
   * @param {string} filters.since - Filter by timestamp (ISO string)
   * @param {number} filters.limit - Limit number of results (default 100)
   * @returns {Promise<Array>} Array of webhook events
   */
  async getEvents(filters = {}) {
    try {
      let query = this.supabase
        .from('webhook_events')
        .select('*')
        .order('timestamp', { ascending: false });

      // Apply filters
      if (filters.type) {
        query = query.eq('type', filters.type);
      }

      if (filters.athleteId) {
        query = query.eq('data->>owner_id', filters.athleteId);
      }

      if (filters.status) {
        query = query.eq('processing->>status', filters.status);
      }

      if (filters.since) {
        query = query.gte('timestamp', filters.since);
      }

      // Apply limit (default 100, max 1000)
      const limit = Math.min(filters.limit || 100, 1000);
      query = query.limit(limit);

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch webhook events:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Exception fetching webhook events:', err);
      return [];
    }
  }

  /**
   * Retrieves a single event by ID
   *
   * @param {string} eventId - Event ID
   * @returns {Promise<Object|null>} Event object or null
   */
  async getEventById(eventId) {
    try {
      const { data, error } = await this.supabase
        .from('webhook_events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) {
        console.error(`Failed to fetch event ${eventId}:`, error);
        return null;
      }

      return data;
    } catch (err) {
      console.error(`Exception fetching event ${eventId}:`, err);
      return null;
    }
  }

  /**
   * Gets statistics about webhook events
   *
   * @returns {Promise<Object>} Statistics object
   */
  async getStats() {
    try {
      // Use the database view for stats
      const { data, error } = await this.supabase
        .from('webhook_events_stats')
        .select('*');

      if (error) {
        console.error('Failed to fetch webhook stats:', error);
        return this.getStatsFromEvents(); // Fallback to manual calculation
      }

      // Transform view data into expected format
      const byType = {};
      const byStatus = {};
      let totalProcessingTime = 0;
      let processedCount = 0;

      data.forEach(row => {
        byType[row.type] = (byType[row.type] || 0) + row.count;
        byStatus[row.status] = (byStatus[row.status] || 0) + row.count;

        if (row.avg_duration_ms) {
          totalProcessingTime += row.avg_duration_ms * row.count;
          processedCount += row.count;
        }
      });

      const total = Object.values(byType).reduce((sum, count) => sum + count, 0);
      const avgTime = processedCount > 0 ? Math.round(totalProcessingTime / processedCount) : 0;

      return {
        total,
        byType,
        byStatus,
        averageProcessingTime: avgTime,
        oldestEvent: data.length > 0 ? data[data.length - 1].oldest_event : null,
        newestEvent: data.length > 0 ? data[0].newest_event : null
      };
    } catch (err) {
      console.error('Exception fetching webhook stats:', err);
      return this.getStatsFromEvents(); // Fallback
    }
  }

  /**
   * Fallback stats calculation from events (if view doesn't exist)
   */
  async getStatsFromEvents() {
    try {
      const { data: events, error } = await this.supabase
        .from('webhook_events')
        .select('type, processing, timestamp')
        .order('timestamp', { ascending: false })
        .limit(1000);

      if (error || !events) {
        return { total: 0, byType: {}, byStatus: {}, averageProcessingTime: 0 };
      }

      const byType = {};
      const byStatus = {};
      let totalProcessingTime = 0;
      let processedCount = 0;

      events.forEach(event => {
        byType[event.type] = (byType[event.type] || 0) + 1;
        const status = event.processing?.status || 'unknown';
        byStatus[status] = (byStatus[status] || 0) + 1;

        if (event.processing?.duration) {
          totalProcessingTime += event.processing.duration;
          processedCount++;
        }
      });

      return {
        total: events.length,
        byType,
        byStatus,
        averageProcessingTime: processedCount > 0 ? Math.round(totalProcessingTime / processedCount) : 0,
        oldestEvent: events.length > 0 ? events[events.length - 1].timestamp : null,
        newestEvent: events.length > 0 ? events[0].timestamp : null
      };
    } catch (err) {
      console.error('Exception calculating stats from events:', err);
      return { total: 0, byType: {}, byStatus: {}, averageProcessingTime: 0 };
    }
  }

  /**
   * Clears old events (optional cleanup, not recommended for production)
   *
   * @param {number} daysToKeep - Number of days of events to keep
   * @returns {Promise<number>} Number of events deleted
   */
  async clearOldEvents(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const { data, error } = await this.supabase
        .from('webhook_events')
        .delete()
        .lt('timestamp', cutoffDate.toISOString())
        .select('id');

      if (error) {
        console.error('Failed to clear old webhook events:', error);
        return 0;
      }

      const count = data?.length || 0;
      console.log(`🧹 Cleared ${count} webhook events older than ${daysToKeep} days`);
      return count;
    } catch (err) {
      console.error('Exception clearing old webhook events:', err);
      return 0;
    }
  }

  /**
   * Generates a unique event ID
   *
   * @returns {string} Unique ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Create singleton instance
const webhookDbLogger = new WebhookEventsDbLogger();

export default webhookDbLogger;

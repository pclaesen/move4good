'use client';

import { useState, useEffect } from 'react';
// Using inline styles for now

export default function WebhookEventsPage() {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({
    type: '',
    athleteId: '',
    status: '',
    limit: '50'
  });
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedEvent, setExpandedEvent] = useState(null);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') {
          params.append(key === 'athleteId' ? 'athlete_id' : key, value);
        }
      });

      const response = await fetch(`/api/webhook-events?${params}`);
      const data = await response.json();
      
      setEvents(data.events);
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching webhook events:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearEvents = async () => {
    if (!confirm('Are you sure you want to clear all webhook events from memory?')) {
      return;
    }
    
    try {
      await fetch('/api/webhook-events', { method: 'DELETE' });
      await fetchEvents();
    } catch (error) {
      console.error('Error clearing events:', error);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [filters]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchEvents, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, filters]);

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (duration) => {
    if (!duration) return 'N/A';
    return `${duration}ms`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return '#22c55e';
      case 'failed': return '#ef4444';
      case 'error': return '#dc2626';
      case 'processing': return '#f59e0b';
      case 'skipped': return '#6b7280';
      default: return '#3b82f6';
    }
  };

  const renderActivityData = (activities) => {
    if (!activities) return null;

    return Object.entries(activities).map(([source, data]) => (
      <div key={source} className='activity-data'>
        <h4>Activity Data from {source}</h4>
        <div className='activity-summary'>
          <p><strong>Name:</strong> {data.data?.name || 'N/A'}</p>
          <p><strong>Type:</strong> {data.data?.type || 'N/A'}</p>
          <p><strong>Distance:</strong> {data.data?.distance ? `${(data.data.distance / 1000).toFixed(2)} km` : 'N/A'}</p>
          <p><strong>Duration:</strong> {data.data?.moving_time ? `${Math.floor(data.data.moving_time / 60)}m ${data.data.moving_time % 60}s` : 'N/A'}</p>
          <p><strong>Start Date:</strong> {data.data?.start_date ? formatTimestamp(data.data.start_date) : 'N/A'}</p>
        </div>
        <details>
          <summary>Raw Activity Data</summary>
          <pre>{JSON.stringify(data.data, null, 2)}</pre>
        </details>
      </div>
    ));
  };

  const renderDatabaseOperations = (database) => {
    if (!database || database.length === 0) return null;

    return (
      <div className='database-operations'>
        <h4>Database Operations</h4>
        {database.map((op, index) => (
          <div key={index} className={`db-operation ${op.success ? 'success' : 'error'}`}>
            <div className='op-header'>
              <span className='op-name'>{op.operation}</span>
              <span className='op-status'>{op.success ? 'SUCCESS' : 'ERROR'}</span>
              <span className='op-time'>{formatTimestamp(op.timestamp)}</span>
            </div>
            {op.result && (
              <div className='op-result'>
                <strong>Result:</strong> {JSON.stringify(op.result)}
              </div>
            )}
            {op.error && (
              <div className='op-error'>
                <strong>Error:</strong> {op.error}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className='webhook-events-page'>
      <div className='header'>
        <h1>Webhook Events Monitor</h1>
        <div className='controls'>
          <label>
            <input
              type='checkbox'
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh (5s)
          </label>
          <button onClick={fetchEvents} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button onClick={clearEvents} className='danger'>
            Clear Events
          </button>
        </div>
      </div>

      <div className='filters'>
        <h3>Filters</h3>
        <div className='filter-grid'>
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          >
            <option value=''>All Event Types</option>
            <option value='webhook'>Webhook Events</option>
            <option value='validation'>Validation Requests</option>
          </select>

          <input
            type='text'
            placeholder='Athlete ID'
            value={filters.athleteId}
            onChange={(e) => setFilters({ ...filters, athleteId: e.target.value })}
          />

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value=''>All Statuses</option>
            <option value='success'>Success</option>
            <option value='failed'>Failed</option>
            <option value='error'>Error</option>
            <option value='processing'>Processing</option>
            <option value='skipped'>Skipped</option>
          </select>

          <select
            value={filters.limit}
            onChange={(e) => setFilters({ ...filters, limit: e.target.value })}
          >
            <option value='10'>Last 10</option>
            <option value='25'>Last 25</option>
            <option value='50'>Last 50</option>
            <option value='100'>Last 100</option>
          </select>
        </div>
      </div>

      <div className='stats'>
        <h3>Statistics</h3>
        <div className='stats-grid'>
          <div className='stat-card'>
            <div className='stat-value'>{stats.total || 0}</div>
            <div className='stat-label'>Total Events</div>
          </div>
          <div className='stat-card'>
            <div className='stat-value'>{stats.averageProcessingTime || 0}ms</div>
            <div className='stat-label'>Avg Processing Time</div>
          </div>
          {stats.byStatus && Object.entries(stats.byStatus).map(([status, count]) => (
            <div key={status} className='stat-card'>
              <div className='stat-value' style={{ color: getStatusColor(status) }}>{count}</div>
              <div className='stat-label'>{status}</div>
            </div>
          ))}
        </div>
      </div>

      <div className='events-list'>
        <h3>Events ({events.length})</h3>
        
        {loading ? (
          <div className='loading'>Loading events...</div>
        ) : events.length === 0 ? (
          <div className='no-events'>No webhook events found</div>
        ) : (
          <div className='events'>
            {events.map((event) => (
              <div key={event.id} className='event-card'>
                <div className='event-header' onClick={() => 
                  setExpandedEvent(expandedEvent === event.id ? null : event.id)
                }>
                  <div className='event-type'>{event.type}</div>
                  <div 
                    className='event-status' 
                    style={{ backgroundColor: getStatusColor(event.processing.status) }}
                  >
                    {event.processing.status}
                  </div>
                  <div className='event-time'>{formatTimestamp(event.timestamp)}</div>
                  <div className='event-duration'>{formatDuration(event.processing.duration)}</div>
                  <div className='expand-icon'>{expandedEvent === event.id ? 'v' : '>'}</div>
                </div>

                {expandedEvent === event.id && (
                  <div className='event-details'>
                    <div className='detail-section'>
                      <h4>Event Data</h4>
                      <pre>{JSON.stringify(event.data, null, 2)}</pre>
                    </div>

                    {event.processing.error && (
                      <div className='detail-section error'>
                        <h4>Error</h4>
                        <p>{event.processing.error}</p>
                      </div>
                    )}

                    {event.metadata.eventDetails && (
                      <div className='detail-section'>
                        <h4>Event Details</h4>
                        <div className='event-details-grid'>
                          <p><strong>Object Type:</strong> {event.metadata.eventDetails.object_type}</p>
                          <p><strong>Object ID:</strong> {event.metadata.eventDetails.object_id}</p>
                          <p><strong>Aspect Type:</strong> {event.metadata.eventDetails.aspect_type}</p>
                          <p><strong>Owner ID:</strong> {event.metadata.eventDetails.owner_id}</p>
                          <p><strong>Event Time:</strong> {event.metadata.eventDetails.event_time}</p>
                        </div>
                      </div>
                    )}

                    {event.metadata.activities && renderActivityData(event.metadata.activities)}

                    {event.metadata.database && renderDatabaseOperations(event.metadata.database)}

                    {event.metadata.validationParams && (
                      <div className='detail-section'>
                        <h4>Validation Parameters</h4>
                        <div className='validation-params'>
                          <p><strong>Mode:</strong> {event.metadata.validationParams.mode}</p>
                          <p><strong>Token Match:</strong> {event.metadata.hasValidToken ? 'YES' : 'NO'}</p>
                          <p><strong>Challenge:</strong> {event.metadata.validationParams.challenge}</p>
                        </div>
                      </div>
                    )}

                    <div className='detail-section'>
                      <h4>Additional Metadata</h4>
                      <pre>{JSON.stringify(event.metadata, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
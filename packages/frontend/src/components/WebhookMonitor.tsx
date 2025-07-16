import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import './WebhookMonitor.css';

interface WebhookEvent {
  id: string;
  formType: string;
  formName: string;
  timestamp: Date;
  status: 'pending' | 'processing' | 'success' | 'error';
  processingTime?: number;
  error?: string;
  patientName?: string;
  patientEmail?: string;
}

interface WebhookStats {
  totalToday: number;
  successRate: number;
  avgProcessingTime: number;
  activeWebhooks: number;
  formBreakdown: { [key: string]: number };
}

export const WebhookMonitor: React.FC = () => {
  const [webhooks, setWebhooks] = useState<WebhookEvent[]>([]);
  const [stats, setStats] = useState<WebhookStats>({
    totalToday: 0,
    successRate: 100,
    avgProcessingTime: 0,
    activeWebhooks: 0,
    formBreakdown: {}
  });
  const [filter, setFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    // Initial load
    fetchWebhooks();
    fetchStats();

    // Set up polling
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchWebhooks();
        fetchStats();
      }, 5000); // Refresh every 5 seconds

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchWebhooks = async () => {
    try {
      const response = await fetch('/api/v1/webhooks/monitor/recent');
      const data = await response.json();
      setWebhooks(data.webhooks);
    } catch (error) {
      console.error('Failed to fetch webhooks:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/v1/webhooks/monitor/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'processing':
        return '⏳';
      default:
        return '🔄';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return '#4caf50';
      case 'error':
        return '#f44336';
      case 'processing':
        return '#ff9800';
      default:
        return '#2196f3';
    }
  };

  const filteredWebhooks = filter === 'all' 
    ? webhooks 
    : webhooks.filter(w => w.status === filter);

  return (
    <div className="webhook-monitor">
      <div className="monitor-header">
        <h2>🔌 Webhook Monitor</h2>
        <div className="monitor-controls">
          <label className="auto-refresh">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <button onClick={() => { fetchWebhooks(); fetchStats(); }}>
            🔄 Refresh Now
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalToday}</div>
          <div className="stat-label">Total Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: stats.successRate >= 95 ? '#4caf50' : '#f44336' }}>
            {stats.successRate.toFixed(1)}%
          </div>
          <div className="stat-label">Success Rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.avgProcessingTime}ms</div>
          <div className="stat-label">Avg Processing</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.activeWebhooks}</div>
          <div className="stat-label">Processing Now</div>
        </div>
      </div>

      {/* Form Type Breakdown */}
      <div className="form-breakdown">
        <h3>Form Submissions by Type</h3>
        <div className="form-stats">
          {Object.entries(stats.formBreakdown).map(([formType, count]) => (
            <div key={formType} className="form-stat">
              <span className="form-type">{formType.replace('_', ' ')}</span>
              <span className="form-count">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Status Filter */}
      <div className="webhook-filters">
        <button 
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All ({webhooks.length})
        </button>
        <button 
          className={filter === 'success' ? 'active' : ''}
          onClick={() => setFilter('success')}
        >
          ✅ Success ({webhooks.filter(w => w.status === 'success').length})
        </button>
        <button 
          className={filter === 'error' ? 'active' : ''}
          onClick={() => setFilter('error')}
        >
          ❌ Errors ({webhooks.filter(w => w.status === 'error').length})
        </button>
        <button 
          className={filter === 'processing' ? 'active' : ''}
          onClick={() => setFilter('processing')}
        >
          ⏳ Processing ({webhooks.filter(w => w.status === 'processing').length})
        </button>
      </div>

      {/* Live Webhook Feed */}
      <div className="webhook-feed">
        <h3>Live Webhook Feed</h3>
        <div className="webhook-list">
          {filteredWebhooks.length === 0 ? (
            <div className="no-webhooks">No webhooks to display</div>
          ) : (
            filteredWebhooks.map((webhook) => (
              <div 
                key={webhook.id} 
                className={`webhook-item ${webhook.status}`}
                style={{ borderLeftColor: getStatusColor(webhook.status) }}
              >
                <div className="webhook-header">
                  <span className="webhook-status">
                    {getStatusIcon(webhook.status)}
                  </span>
                  <span className="webhook-form-type">
                    {webhook.formName || webhook.formType}
                  </span>
                  <span className="webhook-time">
                    {format(new Date(webhook.timestamp), 'HH:mm:ss')}
                  </span>
                </div>
                
                {webhook.patientName && (
                  <div className="webhook-patient">
                    Patient: {webhook.patientName} ({webhook.patientEmail})
                  </div>
                )}
                
                {webhook.processingTime && (
                  <div className="webhook-processing-time">
                    Processed in {webhook.processingTime}ms
                  </div>
                )}
                
                {webhook.error && (
                  <div className="webhook-error">
                    Error: {webhook.error}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="monitor-actions">
        <button className="action-button" onClick={() => window.open('/admin/webhook-config', '_blank')}>
          ⚙️ Configure Webhooks
        </button>
        <button className="action-button" onClick={() => window.open('/admin/form-mappings', '_blank')}>
          🗺️ Field Mappings
        </button>
        <button className="action-button error" onClick={() => window.location.href = '/admin/webhook-errors'}>
          🚨 View All Errors
        </button>
      </div>
    </div>
  );
}; 
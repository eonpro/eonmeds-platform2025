import React, { useState, useEffect } from 'react';
import { 
  TrendingUp,
  TrendingDown,
  Brain,
  LineChart,
  BarChart3,
  PieChart,
  Activity,
  AlertTriangle,
  Zap,
  Target,
  Calendar,
  DollarSign,
  Users,
  FileText,
  Clock,
  ArrowUp,
  ArrowDown,
  Info,
  Download,
  Settings,
  ChevronRight
} from 'lucide-react';
import './AnalyticsDashboard.css';

interface PredictiveInsight {
  id: string;
  type: 'revenue' | 'risk' | 'opportunity' | 'operational';
  title: string;
  description: string;
  impact: string;
  confidence: number;
  action: string;
  priority: 'high' | 'medium' | 'low';
}

interface TrendData {
  label: string;
  current: number;
  previous: number;
  change: number;
  forecast: number;
  confidence: number;
}

interface SegmentAnalysis {
  segment: string;
  revenue: number;
  growth: number;
  risk: number;
  opportunity: number;
  patients: number;
}

export const AnalyticsDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState('90days');
  const [activeView, setActiveView] = useState<'overview' | 'predictive' | 'segments' | 'patterns'>('overview');
  const [loading, setLoading] = useState(true);

  // Predictive insights powered by ML
  const insights: PredictiveInsight[] = [
    {
      id: '1',
      type: 'revenue',
      title: 'Revenue Surge Predicted',
      description: 'Based on historical patterns and current appointments, expect 23% revenue increase in next 30 days',
      impact: '+$285,000',
      confidence: 87,
      action: 'Optimize staff scheduling for peak periods',
      priority: 'high'
    },
    {
      id: '2',
      type: 'risk',
      title: 'Claim Denial Risk Alert',
      description: 'ML model detects 45 claims at high risk of denial due to coding patterns',
      impact: '-$67,000',
      confidence: 92,
      action: 'Review and correct claims before submission',
      priority: 'high'
    },
    {
      id: '3',
      type: 'opportunity',
      title: 'Untapped Revenue Identified',
      description: 'Analysis shows $125,000 in unbilled services from last quarter',
      impact: '+$125,000',
      confidence: 95,
      action: 'Generate supplemental billing batch',
      priority: 'medium'
    },
    {
      id: '4',
      type: 'operational',
      title: 'Collection Efficiency Opportunity',
      description: 'Optimal collection timing analysis suggests moving follow-ups to day 7 instead of day 14',
      impact: '+15% collection rate',
      confidence: 78,
      action: 'Update dunning campaign timing',
      priority: 'medium'
    }
  ];

  // Key performance trends
  const performanceTrends: TrendData[] = [
    {
      label: 'Total Revenue',
      current: 1450000,
      previous: 1280000,
      change: 13.3,
      forecast: 1680000,
      confidence: 85
    },
    {
      label: 'Collection Rate',
      current: 94.5,
      previous: 91.2,
      change: 3.6,
      forecast: 95.8,
      confidence: 88
    },
    {
      label: 'Days in A/R',
      current: 28,
      previous: 35,
      change: -20,
      forecast: 25,
      confidence: 82
    },
    {
      label: 'Patient Volume',
      current: 2845,
      previous: 2650,
      change: 7.4,
      forecast: 3050,
      confidence: 79
    }
  ];

  // Segment analysis
  const segments: SegmentAnalysis[] = [
    {
      segment: 'Medicare',
      revenue: 485000,
      growth: 12.5,
      risk: 15,
      opportunity: 85,
      patients: 890
    },
    {
      segment: 'Commercial Insurance',
      revenue: 620000,
      growth: 18.2,
      risk: 22,
      opportunity: 78,
      patients: 1250
    },
    {
      segment: 'Self-Pay',
      revenue: 185000,
      growth: -5.3,
      risk: 45,
      opportunity: 55,
      patients: 450
    },
    {
      segment: 'Medicaid',
      revenue: 160000,
      growth: 8.7,
      risk: 28,
      opportunity: 72,
      patients: 255
    }
  ];

  // Revenue patterns
  const revenuePatterns = {
    seasonal: {
      Q1: { actual: 3200000, predicted: 3150000, variance: 1.6 },
      Q2: { actual: 3450000, predicted: 3400000, variance: 1.5 },
      Q3: { actual: 3100000, predicted: 3180000, variance: -2.5 },
      Q4: { actual: 3680000, predicted: 3650000, variance: 0.8 }
    },
    dayOfWeek: {
      Monday: 125000,
      Tuesday: 132000,
      Wednesday: 128000,
      Thursday: 135000,
      Friday: 118000,
      Saturday: 45000,
      Sunday: 12000
    },
    procedureGrowth: [
      { procedure: 'Office Visits', growth: 15.2, volume: 12500 },
      { procedure: 'Lab Work', growth: 22.8, volume: 8900 },
      { procedure: 'Imaging', growth: -3.5, volume: 3200 },
      { procedure: 'Procedures', growth: 18.9, volume: 2100 },
      { procedure: 'Telehealth', growth: 145.6, volume: 4500 }
    ]
  };

  useEffect(() => {
    setTimeout(() => setLoading(false), 1500);
  }, []);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'revenue': return <TrendingUp size={20} />;
      case 'risk': return <AlertTriangle size={20} />;
      case 'opportunity': return <Target size={20} />;
      case 'operational': return <Zap size={20} />;
      default: return <Info size={20} />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'revenue': return '#10B981';
      case 'risk': return '#EF4444';
      case 'opportunity': return '#F59E0B';
      case 'operational': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  if (loading) {
    return (
      <div className="ad-loading">
        <div className="ad-loading-animation">
          <Brain size={48} className="ad-brain-icon" />
          <div className="ad-loading-text">
            <h3>Analyzing Revenue Patterns</h3>
            <p>Powered by machine learning algorithms</p>
          </div>
        </div>
        <div className="ad-loading-bar">
          <div className="ad-loading-fill"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      {/* Header */}
      <div className="ad-header">
        <div className="ad-header-content">
          <div className="ad-header-title">
            <Brain size={32} className="ad-header-icon" />
            <div>
              <h1>Analytics & Intelligence Center</h1>
              <p>AI-powered insights and predictive analytics for revenue optimization</p>
            </div>
          </div>
        </div>
        <div className="ad-header-actions">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="ad-time-select"
          >
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="6months">Last 6 Months</option>
            <option value="year">Last Year</option>
          </select>
          <button className="ad-btn ad-btn-secondary">
            <Settings size={16} />
            Configure
          </button>
          <button className="ad-btn ad-btn-primary">
            <Download size={16} />
            Export Insights
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="ad-tabs">
        <button 
          className={`ad-tab ${activeView === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveView('overview')}
        >
          <BarChart3 size={16} />
          Overview
        </button>
        <button 
          className={`ad-tab ${activeView === 'predictive' ? 'active' : ''}`}
          onClick={() => setActiveView('predictive')}
        >
          <Brain size={16} />
          Predictive Insights
        </button>
        <button 
          className={`ad-tab ${activeView === 'segments' ? 'active' : ''}`}
          onClick={() => setActiveView('segments')}
        >
          <PieChart size={16} />
          Segment Analysis
        </button>
        <button 
          className={`ad-tab ${activeView === 'patterns' ? 'active' : ''}`}
          onClick={() => setActiveView('patterns')}
        >
          <Activity size={16} />
          Revenue Patterns
        </button>
      </div>

      {/* Content */}
      <div className="ad-content">
        {activeView === 'overview' && (
          <div className="ad-overview">
            {/* Performance Metrics */}
            <div className="ad-metrics-section">
              <h2>Performance Trends & Forecasts</h2>
              <div className="ad-metrics-grid">
                {performanceTrends.map((trend, index) => (
                  <div key={index} className="ad-metric-card">
                    <div className="ad-metric-header">
                      <h3>{trend.label}</h3>
                      <div className={`ad-metric-change ${trend.change > 0 ? 'positive' : 'negative'}`}>
                        {trend.change > 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                        {Math.abs(trend.change)}%
                      </div>
                    </div>
                    
                    <div className="ad-metric-current">
                      {trend.label === 'Total Revenue' 
                        ? `$${(trend.current / 1000000).toFixed(2)}M`
                        : trend.label.includes('Rate') 
                          ? `${trend.current}%`
                          : trend.label === 'Days in A/R'
                            ? `${trend.current} days`
                            : trend.current.toLocaleString()
                      }
                    </div>
                    
                    <div className="ad-metric-forecast">
                      <div className="ad-forecast-label">
                        <Zap size={14} />
                        30-Day Forecast
                      </div>
                      <div className="ad-forecast-value">
                        {trend.label === 'Total Revenue' 
                          ? `$${(trend.forecast / 1000000).toFixed(2)}M`
                          : trend.label.includes('Rate') 
                            ? `${trend.forecast}%`
                            : trend.label === 'Days in A/R'
                              ? `${trend.forecast} days`
                              : trend.forecast.toLocaleString()
                        }
                      </div>
                      <div className="ad-confidence-bar">
                        <div 
                          className="ad-confidence-fill"
                          style={{ width: `${trend.confidence}%` }}
                        ></div>
                      </div>
                      <span className="ad-confidence-text">{trend.confidence}% confidence</span>
                    </div>

                    <div className="ad-metric-chart">
                      <LineChart size={120} className="ad-chart-placeholder" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Insights */}
            <div className="ad-insights-preview">
              <div className="ad-section-header">
                <h2>Top Predictive Insights</h2>
                <button 
                  className="ad-link-btn"
                  onClick={() => setActiveView('predictive')}
                >
                  View All Insights <ChevronRight size={16} />
                </button>
              </div>
              
              <div className="ad-insights-grid">
                {insights.slice(0, 2).map(insight => (
                  <div 
                    key={insight.id} 
                    className="ad-insight-card"
                    style={{ borderLeftColor: getInsightColor(insight.type) }}
                  >
                    <div className="ad-insight-header">
                      <div 
                        className="ad-insight-icon"
                        style={{ backgroundColor: getInsightColor(insight.type) + '20', color: getInsightColor(insight.type) }}
                      >
                        {getInsightIcon(insight.type)}
                      </div>
                      <span className={`ad-priority-badge ${insight.priority}`}>
                        {insight.priority} priority
                      </span>
                    </div>
                    
                    <h3>{insight.title}</h3>
                    <p>{insight.description}</p>
                    
                    <div className="ad-insight-metrics">
                      <div className="ad-impact">
                        <span>Impact</span>
                        <strong>{insight.impact}</strong>
                      </div>
                      <div className="ad-confidence">
                        <span>Confidence</span>
                        <strong>{insight.confidence}%</strong>
                      </div>
                    </div>
                    
                    <button className="ad-action-btn">
                      {insight.action} →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeView === 'predictive' && (
          <div className="ad-predictive">
            <div className="ad-predictive-header">
              <h2>AI-Powered Predictive Insights</h2>
              <p>Machine learning algorithms analyze patterns to predict future outcomes</p>
            </div>

            <div className="ad-insights-list">
              {insights.map(insight => (
                <div 
                  key={insight.id} 
                  className={`ad-insight-detailed ${insight.priority}`}
                >
                  <div className="ad-insight-main">
                    <div 
                      className="ad-insight-type-icon"
                      style={{ backgroundColor: getInsightColor(insight.type) }}
                    >
                      {getInsightIcon(insight.type)}
                    </div>
                    
                    <div className="ad-insight-content">
                      <div className="ad-insight-header-row">
                        <h3>{insight.title}</h3>
                        <span className={`ad-priority-indicator ${insight.priority}`}>
                          {insight.priority.toUpperCase()}
                        </span>
                      </div>
                      
                      <p className="ad-insight-description">{insight.description}</p>
                      
                      <div className="ad-insight-stats">
                        <div className="ad-stat">
                          <DollarSign size={16} />
                          <span>Financial Impact:</span>
                          <strong className={insight.impact.startsWith('+') ? 'positive' : 'negative'}>
                            {insight.impact}
                          </strong>
                        </div>
                        <div className="ad-stat">
                          <Brain size={16} />
                          <span>ML Confidence:</span>
                          <strong>{insight.confidence}%</strong>
                        </div>
                        <div className="ad-stat">
                          <Clock size={16} />
                          <span>Time Horizon:</span>
                          <strong>30 days</strong>
                        </div>
                      </div>
                      
                      <div className="ad-insight-action">
                        <button className="ad-btn ad-btn-primary">
                          {insight.action}
                        </button>
                        <button className="ad-btn ad-btn-text">
                          View Analysis Details
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="ad-insight-visualization">
                    <div className="ad-confidence-meter">
                      <svg viewBox="0 0 100 50" className="ad-meter-svg">
                        <path
                          d="M 10 45 A 35 35 0 0 1 90 45"
                          fill="none"
                          stroke="#E5E7EB"
                          strokeWidth="8"
                        />
                        <path
                          d="M 10 45 A 35 35 0 0 1 90 45"
                          fill="none"
                          stroke={getInsightColor(insight.type)}
                          strokeWidth="8"
                          strokeDasharray={`${(insight.confidence / 100) * 138} 138`}
                        />
                      </svg>
                      <div className="ad-meter-value">{insight.confidence}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'segments' && (
          <div className="ad-segments">
            <div className="ad-segments-header">
              <h2>Revenue Segment Analysis</h2>
              <p>Deep dive into performance by payer segment</p>
            </div>

            <div className="ad-segments-grid">
              {segments.map((segment, index) => (
                <div key={index} className="ad-segment-card">
                  <div className="ad-segment-header">
                    <h3>{segment.segment}</h3>
                    <span className="ad-segment-patients">{segment.patients} patients</span>
                  </div>
                  
                  <div className="ad-segment-revenue">
                    <div className="ad-revenue-amount">
                      ${(segment.revenue / 1000).toFixed(0)}K
                    </div>
                    <div className={`ad-revenue-growth ${segment.growth > 0 ? 'positive' : 'negative'}`}>
                      {segment.growth > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      {Math.abs(segment.growth)}% growth
                    </div>
                  </div>
                  
                  <div className="ad-segment-metrics">
                    <div className="ad-metric-bar">
                      <div className="ad-bar-label">
                        <span>Risk Score</span>
                        <span>{segment.risk}%</span>
                      </div>
                      <div className="ad-bar-container">
                        <div 
                          className="ad-bar-fill risk"
                          style={{ width: `${segment.risk}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="ad-metric-bar">
                      <div className="ad-bar-label">
                        <span>Opportunity Score</span>
                        <span>{segment.opportunity}%</span>
                      </div>
                      <div className="ad-bar-container">
                        <div 
                          className="ad-bar-fill opportunity"
                          style={{ width: `${segment.opportunity}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="ad-segment-insights">
                    <h4>Key Insights</h4>
                    {segment.segment === 'Medicare' && (
                      <ul>
                        <li>Fastest growing segment</li>
                        <li>Lowest denial rate</li>
                        <li>Opportunity: Wellness programs</li>
                      </ul>
                    )}
                    {segment.segment === 'Commercial Insurance' && (
                      <ul>
                        <li>Highest revenue per patient</li>
                        <li>Moderate growth trajectory</li>
                        <li>Focus on contract negotiations</li>
                      </ul>
                    )}
                    {segment.segment === 'Self-Pay' && (
                      <ul>
                        <li>High collection risk</li>
                        <li>Declining volume</li>
                        <li>Implement payment plans</li>
                      </ul>
                    )}
                    {segment.segment === 'Medicaid' && (
                      <ul>
                        <li>Stable growth pattern</li>
                        <li>High administrative burden</li>
                        <li>Automate prior auth</li>
                      </ul>
                    )}
                  </div>
                  
                  <button className="ad-segment-action">
                    Analyze Segment →
                  </button>
                </div>
              ))}
            </div>

            <div className="ad-segment-comparison">
              <h3>Segment Performance Matrix</h3>
              <div className="ad-matrix-chart">
                <PieChart size={200} className="ad-chart-placeholder" />
              </div>
            </div>
          </div>
        )}

        {activeView === 'patterns' && (
          <div className="ad-patterns">
            <div className="ad-patterns-header">
              <h2>Revenue Pattern Recognition</h2>
              <p>Historical patterns and anomaly detection</p>
            </div>

            {/* Seasonal Patterns */}
            <div className="ad-pattern-section">
              <h3>Seasonal Revenue Patterns</h3>
              <div className="ad-seasonal-grid">
                {Object.entries(revenuePatterns.seasonal).map(([quarter, data]) => (
                  <div key={quarter} className="ad-seasonal-card">
                    <h4>{quarter}</h4>
                    <div className="ad-seasonal-amount">
                      ${(data.actual / 1000000).toFixed(2)}M
                    </div>
                    <div className="ad-seasonal-variance">
                      <span>vs. Predicted:</span>
                      <strong className={data.variance > 0 ? 'positive' : 'negative'}>
                        {data.variance > 0 ? '+' : ''}{data.variance}%
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Day of Week Patterns */}
            <div className="ad-pattern-section">
              <h3>Revenue by Day of Week</h3>
              <div className="ad-dow-chart">
                {Object.entries(revenuePatterns.dayOfWeek).map(([day, revenue]) => (
                  <div key={day} className="ad-dow-bar">
                    <div 
                      className="ad-dow-fill"
                      style={{ height: `${(revenue / 135000) * 100}%` }}
                    ></div>
                    <span className="ad-dow-label">{day.slice(0, 3)}</span>
                    <span className="ad-dow-value">${(revenue / 1000).toFixed(0)}K</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Procedure Growth */}
            <div className="ad-pattern-section">
              <h3>Service Line Growth Analysis</h3>
              <div className="ad-procedure-list">
                {revenuePatterns.procedureGrowth.map((proc, index) => (
                  <div key={index} className="ad-procedure-item">
                    <div className="ad-procedure-info">
                      <h4>{proc.procedure}</h4>
                      <span className="ad-procedure-volume">{proc.volume.toLocaleString()} procedures</span>
                    </div>
                    <div className={`ad-procedure-growth ${proc.growth > 0 ? 'positive' : 'negative'}`}>
                      {proc.growth > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      {Math.abs(proc.growth)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Anomaly Detection */}
            <div className="ad-pattern-section">
              <h3>Anomaly Detection</h3>
              <div className="ad-anomaly-alert">
                <AlertTriangle size={20} />
                <div>
                  <h4>Unusual Pattern Detected</h4>
                  <p>Tuesday revenue 18% below historical average - investigate staffing or system issues</p>
                </div>
                <button className="ad-btn ad-btn-secondary">Investigate</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

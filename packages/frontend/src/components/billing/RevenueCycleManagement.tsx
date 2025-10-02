import React, { useState, useEffect } from 'react';
import { 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Users,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Activity,
  BarChart,
  PieChart,
  Calendar,
  Target,
  Zap,
  Shield,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react';
import './RevenueCycleManagement.css';

interface RCMMetric {
  label: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  target?: number;
  unit?: string;
}

interface StageMetrics {
  stage: string;
  amount: number;
  count: number;
  avgDays: number;
  percentage: number;
  color: string;
}

export const RevenueCycleManagement: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedMetric, setSelectedMetric] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Mock data for comprehensive RCM metrics
  const kpiMetrics: RCMMetric[] = [
    {
      label: 'Net Collection Rate',
      value: '96.2',
      change: 2.1,
      trend: 'up',
      target: 95,
      unit: '%'
    },
    {
      label: 'Days in A/R',
      value: '32',
      change: -3,
      trend: 'down',
      target: 35,
      unit: 'days'
    },
    {
      label: 'Clean Claim Rate',
      value: '94.8',
      change: 1.5,
      trend: 'up',
      target: 90,
      unit: '%'
    },
    {
      label: 'Denial Rate',
      value: '5.2',
      change: -0.8,
      trend: 'down',
      target: 5,
      unit: '%'
    },
    {
      label: 'Cost to Collect',
      value: '3.1',
      change: -0.2,
      trend: 'down',
      target: 4,
      unit: '%'
    },
    {
      label: 'Patient Collection Rate',
      value: '78.5',
      change: 3.2,
      trend: 'up',
      target: 75,
      unit: '%'
    }
  ];

  const revenueStages: StageMetrics[] = [
    {
      stage: 'Scheduling',
      amount: 850000,
      count: 2150,
      avgDays: 0,
      percentage: 100,
      color: '#3B82F6'
    },
    {
      stage: 'Registration',
      amount: 820000,
      count: 2080,
      avgDays: 1,
      percentage: 96.5,
      color: '#6366F1'
    },
    {
      stage: 'Charge Capture',
      amount: 780000,
      count: 1980,
      avgDays: 3,
      percentage: 91.8,
      color: '#8B5CF6'
    },
    {
      stage: 'Claim Submission',
      amount: 750000,
      count: 1900,
      avgDays: 5,
      percentage: 88.2,
      color: '#A855F7'
    },
    {
      stage: 'Payment Posting',
      amount: 680000,
      count: 1720,
      avgDays: 28,
      percentage: 80,
      color: '#10B981'
    },
    {
      stage: 'A/R Follow-up',
      amount: 120000,
      count: 300,
      avgDays: 45,
      percentage: 14.1,
      color: '#F59E0B'
    },
    {
      stage: 'Collections',
      amount: 50000,
      count: 125,
      avgDays: 90,
      percentage: 5.9,
      color: '#EF4444'
    }
  ];

  const denialReasons = [
    { reason: 'Prior Authorization', count: 145, amount: 125000, percentage: 28 },
    { reason: 'Eligibility', count: 98, amount: 85000, percentage: 19 },
    { reason: 'Medical Necessity', count: 87, amount: 95000, percentage: 17 },
    { reason: 'Coding Errors', count: 72, amount: 62000, percentage: 14 },
    { reason: 'Duplicate Claim', count: 56, amount: 45000, percentage: 11 },
    { reason: 'Timely Filing', count: 41, amount: 38000, percentage: 8 },
    { reason: 'Other', count: 15, amount: 12000, percentage: 3 }
  ];

  const payerPerformance = [
    { payer: 'Blue Cross Blue Shield', avgDays: 24, denialRate: 4.2, amount: 245000 },
    { payer: 'Aetna', avgDays: 28, denialRate: 5.8, amount: 198000 },
    { payer: 'United Healthcare', avgDays: 30, denialRate: 6.1, amount: 176000 },
    { payer: 'Cigna', avgDays: 26, denialRate: 4.9, amount: 165000 },
    { payer: 'Medicare', avgDays: 18, denialRate: 3.2, amount: 142000 },
    { payer: 'Medicaid', avgDays: 35, denialRate: 7.5, amount: 98000 }
  ];

  useEffect(() => {
    // Simulate data loading
    setTimeout(() => setLoading(false), 1000);
  }, [selectedPeriod]);

  const getMetricIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp size={16} />;
    if (trend === 'down') return <TrendingDown size={16} />;
    return <Activity size={16} />;
  };

  const getMetricClass = (metric: RCMMetric) => {
    // For metrics where lower is better (like days in A/R, denial rate)
    const lowerIsBetter = ['Days in A/R', 'Denial Rate', 'Cost to Collect'].includes(metric.label);
    
    if (lowerIsBetter) {
      return metric.trend === 'down' ? 'positive' : 'negative';
    }
    return metric.trend === 'up' ? 'positive' : 'negative';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="rcm-loading">
        <div className="rcm-spinner"></div>
        <p>Loading revenue cycle data...</p>
      </div>
    );
  }

  return (
    <div className="revenue-cycle-management">
      {/* Header */}
      <div className="rcm-header">
        <div className="rcm-header-content">
          <h1>Revenue Cycle Management</h1>
          <p>Complete visibility into your practice's financial performance</p>
        </div>
        <div className="rcm-header-actions">
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="rcm-period-select"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button className="rcm-btn rcm-btn-secondary">
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="rcm-btn rcm-btn-primary">
            <Download size={16} />
            Export Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="rcm-kpi-grid">
        {kpiMetrics.map((metric, index) => (
          <div key={index} className="rcm-kpi-card">
            <div className="rcm-kpi-header">
              <span className="rcm-kpi-label">{metric.label}</span>
              <div className={`rcm-kpi-trend ${getMetricClass(metric)}`}>
                {getMetricIcon(metric.trend)}
                {Math.abs(metric.change)}%
              </div>
            </div>
            <div className="rcm-kpi-value">
              {metric.value}{metric.unit}
            </div>
            {metric.target && (
              <div className="rcm-kpi-target">
                <div className="rcm-target-bar">
                  <div 
                    className="rcm-target-fill"
                    style={{ 
                      width: `${Math.min((Number(metric.value) / metric.target) * 100, 100)}%`,
                      backgroundColor: Number(metric.value) >= metric.target ? '#10B981' : '#F59E0B'
                    }}
                  ></div>
                </div>
                <span className="rcm-target-text">Target: {metric.target}{metric.unit}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Revenue Flow Visualization */}
      <div className="rcm-revenue-flow">
        <div className="rcm-section-header">
          <h2>Revenue Flow Analysis</h2>
          <button className="rcm-link-btn">View Details →</button>
        </div>
        
        <div className="rcm-flow-chart">
          {revenueStages.map((stage, index) => (
            <div key={index} className="rcm-flow-stage">
              <div className="rcm-stage-header">
                <h4>{stage.stage}</h4>
                <span className="rcm-stage-days">{stage.avgDays} days</span>
              </div>
              
              <div className="rcm-stage-metrics">
                <div className="rcm-stage-amount">{formatCurrency(stage.amount)}</div>
                <div className="rcm-stage-count">{stage.count} items</div>
              </div>
              
              <div className="rcm-stage-bar">
                <div 
                  className="rcm-stage-fill"
                  style={{ 
                    width: `${stage.percentage}%`,
                    backgroundColor: stage.color
                  }}
                ></div>
              </div>
              
              <div className="rcm-stage-percentage">{stage.percentage.toFixed(1)}%</div>
              
              {index < revenueStages.length - 1 && (
                <div className="rcm-flow-arrow">→</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="rcm-content-grid">
        {/* Denial Analysis */}
        <div className="rcm-card rcm-denial-analysis">
          <div className="rcm-card-header">
            <h2>Denial Analysis</h2>
            <button className="rcm-link-btn">Manage Denials →</button>
          </div>
          
          <div className="rcm-denial-summary">
            <div className="rcm-denial-stat">
              <AlertCircle size={24} className="rcm-denial-icon" />
              <div>
                <p className="rcm-denial-value">514</p>
                <p className="rcm-denial-label">Total Denials</p>
              </div>
            </div>
            <div className="rcm-denial-stat">
              <DollarSign size={24} className="rcm-denial-icon" />
              <div>
                <p className="rcm-denial-value">{formatCurrency(462000)}</p>
                <p className="rcm-denial-label">At Risk</p>
              </div>
            </div>
            <div className="rcm-denial-stat">
              <RefreshCw size={24} className="rcm-denial-icon" />
              <div>
                <p className="rcm-denial-value">68%</p>
                <p className="rcm-denial-label">Recovery Rate</p>
              </div>
            </div>
          </div>
          
          <div className="rcm-denial-reasons">
            <h3>Top Denial Reasons</h3>
            {denialReasons.map((reason, index) => (
              <div key={index} className="rcm-denial-item">
                <div className="rcm-denial-info">
                  <span className="rcm-denial-reason">{reason.reason}</span>
                  <span className="rcm-denial-count">{reason.count} claims</span>
                </div>
                <div className="rcm-denial-bar-container">
                  <div 
                    className="rcm-denial-bar"
                    style={{ width: `${reason.percentage}%` }}
                  ></div>
                </div>
                <span className="rcm-denial-amount">{formatCurrency(reason.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payer Performance */}
        <div className="rcm-card rcm-payer-performance">
          <div className="rcm-card-header">
            <h2>Payer Performance</h2>
            <button className="rcm-link-btn">Contract Analysis →</button>
          </div>
          
          <div className="rcm-payer-table">
            <table>
              <thead>
                <tr>
                  <th>Payer</th>
                  <th>Avg Days</th>
                  <th>Denial Rate</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {payerPerformance.map((payer, index) => (
                  <tr key={index}>
                    <td className="rcm-payer-name">{payer.payer}</td>
                    <td>
                      <span className={`rcm-days ${payer.avgDays <= 30 ? 'good' : 'warning'}`}>
                        {payer.avgDays}
                      </span>
                    </td>
                    <td>
                      <span className={`rcm-rate ${payer.denialRate <= 5 ? 'good' : 'warning'}`}>
                        {payer.denialRate}%
                      </span>
                    </td>
                    <td className="rcm-payer-amount">{formatCurrency(payer.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="rcm-payer-insights">
            <div className="rcm-insight">
              <CheckCircle size={16} />
              <span>Medicare has the fastest payment cycle</span>
            </div>
            <div className="rcm-insight warning">
              <AlertCircle size={16} />
              <span>Medicaid denial rate exceeds target</span>
            </div>
          </div>
        </div>

        {/* Action Items */}
        <div className="rcm-card rcm-action-items">
          <div className="rcm-card-header">
            <h2>Action Items</h2>
            <span className="rcm-badge">12 pending</span>
          </div>
          
          <div className="rcm-actions-list">
            <div className="rcm-action-item high">
              <div className="rcm-action-icon">
                <AlertCircle size={20} />
              </div>
              <div className="rcm-action-content">
                <h4>High-Value Claims at Risk</h4>
                <p>23 claims totaling $125,000 need immediate attention</p>
                <button className="rcm-action-btn">Review Claims</button>
              </div>
            </div>
            
            <div className="rcm-action-item medium">
              <div className="rcm-action-icon">
                <Clock size={20} />
              </div>
              <div className="rcm-action-content">
                <h4>Aging A/R Review</h4>
                <p>$85,000 in receivables over 90 days</p>
                <button className="rcm-action-btn">View Report</button>
              </div>
            </div>
            
            <div className="rcm-action-item low">
              <div className="rcm-action-icon">
                <Target size={20} />
              </div>
              <div className="rcm-action-content">
                <h4>Contract Renegotiation</h4>
                <p>3 payer contracts up for renewal this quarter</p>
                <button className="rcm-action-btn">Schedule Review</button>
              </div>
            </div>
          </div>
        </div>

        {/* Productivity Metrics */}
        <div className="rcm-card rcm-productivity">
          <div className="rcm-card-header">
            <h2>Team Productivity</h2>
            <button className="rcm-link-btn">Staff Management →</button>
          </div>
          
          <div className="rcm-productivity-stats">
            <div className="rcm-prod-stat">
              <h4>Claims Processed</h4>
              <p className="rcm-prod-value">1,847</p>
              <p className="rcm-prod-change positive">+12% vs last month</p>
            </div>
            <div className="rcm-prod-stat">
              <h4>Avg Processing Time</h4>
              <p className="rcm-prod-value">4.2 min</p>
              <p className="rcm-prod-change positive">-18% improvement</p>
            </div>
            <div className="rcm-prod-stat">
              <h4>First Pass Rate</h4>
              <p className="rcm-prod-value">94.8%</p>
              <p className="rcm-prod-change positive">+2.1% increase</p>
            </div>
          </div>
          
          <div className="rcm-team-performance">
            <h3>Top Performers</h3>
            <div className="rcm-performer">
              <span className="rcm-performer-name">Sarah Johnson</span>
              <span className="rcm-performer-metric">342 claims</span>
              <div className="rcm-performer-bar">
                <div className="rcm-performer-fill" style={{ width: '95%' }}></div>
              </div>
            </div>
            <div className="rcm-performer">
              <span className="rcm-performer-name">Mike Chen</span>
              <span className="rcm-performer-metric">318 claims</span>
              <div className="rcm-performer-bar">
                <div className="rcm-performer-fill" style={{ width: '88%' }}></div>
              </div>
            </div>
            <div className="rcm-performer">
              <span className="rcm-performer-name">Lisa Davis</span>
              <span className="rcm-performer-metric">297 claims</span>
              <div className="rcm-performer-bar">
                <div className="rcm-performer-fill" style={{ width: '82%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Forecast */}
      <div className="rcm-forecast">
        <div className="rcm-section-header">
          <h2>90-Day Financial Forecast</h2>
          <button className="rcm-link-btn">Advanced Analytics →</button>
        </div>
        
        <div className="rcm-forecast-content">
          <div className="rcm-forecast-summary">
            <div className="rcm-forecast-item">
              <h4>Expected Collections</h4>
              <p className="rcm-forecast-value">{formatCurrency(2450000)}</p>
              <p className="rcm-forecast-detail">Based on current A/R and historical patterns</p>
            </div>
            <div className="rcm-forecast-item">
              <h4>At-Risk Revenue</h4>
              <p className="rcm-forecast-value warning">{formatCurrency(185000)}</p>
              <p className="rcm-forecast-detail">Requires intervention to prevent write-offs</p>
            </div>
            <div className="rcm-forecast-item">
              <h4>Cash Flow Projection</h4>
              <p className="rcm-forecast-value">{formatCurrency(2265000)}</p>
              <p className="rcm-forecast-detail">92.5% confidence interval</p>
            </div>
          </div>
          
          <div className="rcm-forecast-chart">
            {/* Placeholder for actual chart */}
            <div className="rcm-chart-placeholder">
              <BarChart size={48} />
              <p>Revenue Forecast Chart</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

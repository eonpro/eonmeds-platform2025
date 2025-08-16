import React, { useState, useEffect } from 'react';
import { 
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Search,
  Download,
  Users,
  Calendar,
  DollarSign,
  FileText,
  Activity,
  Zap,
  ChevronRight,
  Info,
  Phone,
  Mail,
  CreditCard,
  Heart,
  Building,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import './InsuranceEligibilityVerification.css';

interface EligibilityCheck {
  id: string;
  patientName: string;
  patientId: string;
  insuranceProvider: string;
  policyNumber: string;
  groupNumber?: string;
  checkType: 'real-time' | 'batch' | 'manual';
  status: 'pending' | 'verified' | 'invalid' | 'error' | 'expired';
  timestamp: Date;
  benefits?: BenefitDetails;
  errors?: string[];
}

interface BenefitDetails {
  eligibilityStatus: 'active' | 'inactive' | 'terminated';
  effectiveDate: string;
  terminationDate?: string;
  coverageType: string;
  copay?: number;
  deductible: {
    individual: number;
    individualMet: number;
    family: number;
    familyMet: number;
  };
  outOfPocketMax: {
    individual: number;
    individualMet: number;
    family: number;
    familyMet: number;
  };
  coinsurance?: number;
  preAuthRequired: boolean;
  primaryCarePhysician?: string;
  network: 'in-network' | 'out-of-network';
}

interface VerificationStats {
  total: number;
  verified: number;
  invalid: number;
  pending: number;
  successRate: number;
  avgResponseTime: number;
}

export const InsuranceEligibilityVerification: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'verify' | 'history' | 'rules' | 'analytics'>('verify');
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [verificationResults, setVerificationResults] = useState<EligibilityCheck[]>([]);
  const [batchFile, setBatchFile] = useState<File | null>(null);

  // Mock data
  const recentChecks: EligibilityCheck[] = [
    {
      id: '1',
      patientName: 'John Doe',
      patientId: 'P12345',
      insuranceProvider: 'Blue Cross Blue Shield',
      policyNumber: 'BC123456789',
      groupNumber: 'GRP001',
      checkType: 'real-time',
      status: 'verified',
      timestamp: new Date('2024-11-29T10:30:00'),
      benefits: {
        eligibilityStatus: 'active',
        effectiveDate: '2024-01-01',
        coverageType: 'PPO',
        copay: 25,
        deductible: {
          individual: 1500,
          individualMet: 750,
          family: 3000,
          familyMet: 1200
        },
        outOfPocketMax: {
          individual: 6000,
          individualMet: 1500,
          family: 12000,
          familyMet: 3000
        },
        coinsurance: 20,
        preAuthRequired: false,
        primaryCarePhysician: 'Dr. Smith',
        network: 'in-network'
      }
    },
    {
      id: '2',
      patientName: 'Jane Smith',
      patientId: 'P12346',
      insuranceProvider: 'Aetna',
      policyNumber: 'AET987654321',
      checkType: 'real-time',
      status: 'invalid',
      timestamp: new Date('2024-11-29T09:15:00'),
      errors: ['Policy number not found', 'Patient DOB mismatch']
    },
    {
      id: '3',
      patientName: 'Robert Johnson',
      patientId: 'P12347',
      insuranceProvider: 'United Healthcare',
      policyNumber: 'UHC456789123',
      checkType: 'batch',
      status: 'expired',
      timestamp: new Date('2024-11-29T08:00:00'),
      benefits: {
        eligibilityStatus: 'terminated',
        effectiveDate: '2023-01-01',
        terminationDate: '2024-10-31',
        coverageType: 'HMO',
        deductible: {
          individual: 2000,
          individualMet: 2000,
          family: 4000,
          familyMet: 4000
        },
        outOfPocketMax: {
          individual: 8000,
          individualMet: 8000,
          family: 16000,
          familyMet: 16000
        },
        preAuthRequired: true,
        network: 'in-network'
      }
    }
  ];

  const verificationStats: VerificationStats = {
    total: 1547,
    verified: 1342,
    invalid: 156,
    pending: 49,
    successRate: 86.8,
    avgResponseTime: 2.3
  };

  const insuranceProviders = [
    { id: 'bcbs', name: 'Blue Cross Blue Shield', apiEnabled: true, avgResponseTime: 1.2 },
    { id: 'aetna', name: 'Aetna', apiEnabled: true, avgResponseTime: 1.8 },
    { id: 'united', name: 'United Healthcare', apiEnabled: true, avgResponseTime: 2.1 },
    { id: 'cigna', name: 'Cigna', apiEnabled: true, avgResponseTime: 1.5 },
    { id: 'humana', name: 'Humana', apiEnabled: false, avgResponseTime: null },
    { id: 'medicare', name: 'Medicare', apiEnabled: true, avgResponseTime: 3.2 },
    { id: 'medicaid', name: 'Medicaid', apiEnabled: true, avgResponseTime: 4.5 }
  ];

  const verifyEligibility = async () => {
    setIsVerifying(true);
    // Simulate API call
    setTimeout(() => {
      setIsVerifying(false);
      // Add mock result
      const newCheck: EligibilityCheck = {
        id: Date.now().toString(),
        patientName: selectedPatient?.name || 'Test Patient',
        patientId: selectedPatient?.id || 'P99999',
        insuranceProvider: 'Blue Cross Blue Shield',
        policyNumber: 'BC999999999',
        checkType: 'real-time',
        status: 'verified',
        timestamp: new Date(),
        benefits: {
          eligibilityStatus: 'active',
          effectiveDate: '2024-01-01',
          coverageType: 'PPO',
          copay: 30,
          deductible: {
            individual: 2000,
            individualMet: 500,
            family: 4000,
            familyMet: 1000
          },
          outOfPocketMax: {
            individual: 7000,
            individualMet: 800,
            family: 14000,
            familyMet: 1600
          },
          coinsurance: 20,
          preAuthRequired: false,
          network: 'in-network'
        }
      };
      setVerificationResults([newCheck, ...verificationResults]);
    }, 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle size={20} />;
      case 'invalid': return <XCircle size={20} />;
      case 'expired': return <AlertCircle size={20} />;
      case 'pending': return <Clock size={20} />;
      default: return <Info size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return '#10B981';
      case 'invalid': return '#EF4444';
      case 'expired': return '#F59E0B';
      case 'pending': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  return (
    <div className="insurance-eligibility-verification">
      {/* Header */}
      <div className="iev-header">
        <div className="iev-header-content">
          <div className="iev-header-main">
            <Shield size={32} className="iev-header-icon" />
            <div>
              <h1>Insurance Eligibility Verification</h1>
              <p>Real-time verification with 270+ insurance providers</p>
            </div>
          </div>
          <div className="iev-header-stats">
            <div className="iev-stat">
              <span className="iev-stat-value">{verificationStats.successRate}%</span>
              <span className="iev-stat-label">Success Rate</span>
            </div>
            <div className="iev-stat">
              <span className="iev-stat-value">{verificationStats.avgResponseTime}s</span>
              <span className="iev-stat-label">Avg Response</span>
            </div>
            <div className="iev-stat">
              <span className="iev-stat-value">{verificationStats.total}</span>
              <span className="iev-stat-label">Checks Today</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="iev-nav">
        <button 
          className={`iev-nav-item ${activeTab === 'verify' ? 'active' : ''}`}
          onClick={() => setActiveTab('verify')}
        >
          <Search size={16} />
          Verify Eligibility
        </button>
        <button 
          className={`iev-nav-item ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <Clock size={16} />
          Verification History
        </button>
        <button 
          className={`iev-nav-item ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          <FileText size={16} />
          Coverage Rules
        </button>
        <button 
          className={`iev-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <Activity size={16} />
          Analytics
        </button>
      </div>

      {/* Content */}
      <div className="iev-content">
        {activeTab === 'verify' && (
          <div className="iev-verify">
            {/* Verification Form */}
            <div className="iev-form-section">
              <h2>Patient Insurance Information</h2>
              <div className="iev-form-grid">
                <div className="iev-form-group">
                  <label>Patient Name</label>
                  <input type="text" placeholder="Enter patient name" className="iev-input" />
                </div>
                <div className="iev-form-group">
                  <label>Date of Birth</label>
                  <input type="date" className="iev-input" />
                </div>
                <div className="iev-form-group">
                  <label>Insurance Provider</label>
                  <select className="iev-select">
                    <option>Select provider...</option>
                    {insuranceProviders.map(provider => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name} {provider.apiEnabled && '(Real-time)'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="iev-form-group">
                  <label>Policy Number</label>
                  <input type="text" placeholder="Enter policy number" className="iev-input" />
                </div>
                <div className="iev-form-group">
                  <label>Group Number</label>
                  <input type="text" placeholder="Enter group number (optional)" className="iev-input" />
                </div>
                <div className="iev-form-group">
                  <label>Service Date</label>
                  <input type="date" className="iev-input" defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
              </div>

              <div className="iev-form-actions">
                <button 
                  className={`iev-btn iev-btn-primary ${isVerifying ? 'loading' : ''}`}
                  onClick={verifyEligibility}
                  disabled={isVerifying}
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw size={16} className="iev-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Zap size={16} />
                      Verify Eligibility
                    </>
                  )}
                </button>
                <button className="iev-btn iev-btn-secondary">
                  <Users size={16} />
                  Batch Verify
                </button>
              </div>
            </div>

            {/* Latest Verification Result */}
            {verificationResults.length > 0 && (
              <div className="iev-result-section">
                <h2>Verification Result</h2>
                {verificationResults.map(result => (
                  <div key={result.id} className={`iev-result-card ${result.status}`}>
                    <div className="iev-result-header">
                      <div className="iev-result-patient">
                        <h3>{result.patientName}</h3>
                        <p>{result.insuranceProvider} • {result.policyNumber}</p>
                      </div>
                      <div 
                        className="iev-result-status"
                        style={{ color: getStatusColor(result.status) }}
                      >
                        {getStatusIcon(result.status)}
                        <span>{result.status.toUpperCase()}</span>
                      </div>
                    </div>

                    {result.benefits && (
                      <div className="iev-benefits-grid">
                        <div className="iev-benefit-card">
                          <h4>Coverage Status</h4>
                          <p className={`iev-coverage-status ${result.benefits.eligibilityStatus}`}>
                            {result.benefits.eligibilityStatus.toUpperCase()}
                          </p>
                          <span>Effective: {result.benefits.effectiveDate}</span>
                          {result.benefits.terminationDate && (
                            <span className="iev-termination">Terminated: {result.benefits.terminationDate}</span>
                          )}
                        </div>

                        <div className="iev-benefit-card">
                          <h4>Deductible</h4>
                          <div className="iev-deductible-info">
                            <div className="iev-deductible-item">
                              <span>Individual</span>
                              <strong>${result.benefits.deductible.individualMet} / ${result.benefits.deductible.individual}</strong>
                            </div>
                            <div className="iev-progress-bar">
                              <div 
                                className="iev-progress-fill"
                                style={{ width: `${(result.benefits.deductible.individualMet / result.benefits.deductible.individual) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>

                        <div className="iev-benefit-card">
                          <h4>Out of Pocket Max</h4>
                          <div className="iev-oop-info">
                            <div className="iev-oop-item">
                              <span>Individual</span>
                              <strong>${result.benefits.outOfPocketMax.individualMet} / ${result.benefits.outOfPocketMax.individual}</strong>
                            </div>
                            <div className="iev-progress-bar">
                              <div 
                                className="iev-progress-fill"
                                style={{ width: `${(result.benefits.outOfPocketMax.individualMet / result.benefits.outOfPocketMax.individual) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>

                        <div className="iev-benefit-card">
                          <h4>Plan Details</h4>
                          <div className="iev-plan-details">
                            <div className="iev-detail-item">
                              <span>Type:</span>
                              <strong>{result.benefits.coverageType}</strong>
                            </div>
                            <div className="iev-detail-item">
                              <span>Copay:</span>
                              <strong>${result.benefits.copay || 'N/A'}</strong>
                            </div>
                            <div className="iev-detail-item">
                              <span>Coinsurance:</span>
                              <strong>{result.benefits.coinsurance}%</strong>
                            </div>
                            <div className="iev-detail-item">
                              <span>Network:</span>
                              <strong className={result.benefits.network === 'in-network' ? 'in-network' : 'out-network'}>
                                {result.benefits.network}
                              </strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {result.errors && (
                      <div className="iev-errors">
                        <h4>Verification Errors</h4>
                        {result.errors.map((error, index) => (
                          <div key={index} className="iev-error-item">
                            <AlertCircle size={16} />
                            {error}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="iev-result-actions">
                      <button className="iev-btn iev-btn-text">
                        <FileText size={16} />
                        View Full Report
                      </button>
                      <button className="iev-btn iev-btn-text">
                        <Download size={16} />
                        Export
                      </button>
                      <button className="iev-btn iev-btn-text">
                        <RefreshCw size={16} />
                        Re-verify
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="iev-history">
            <div className="iev-history-header">
              <h2>Verification History</h2>
              <div className="iev-history-filters">
                <input 
                  type="text" 
                  placeholder="Search by patient or policy..."
                  className="iev-search-input"
                />
                <select className="iev-filter-select">
                  <option>All Statuses</option>
                  <option>Verified</option>
                  <option>Invalid</option>
                  <option>Expired</option>
                  <option>Error</option>
                </select>
                <button className="iev-btn iev-btn-secondary">
                  <Download size={16} />
                  Export
                </button>
              </div>
            </div>

            <div className="iev-history-table">
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Insurance</th>
                    <th>Policy #</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Timestamp</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentChecks.map(check => (
                    <tr key={check.id}>
                      <td>
                        <div className="iev-patient-cell">
                          <strong>{check.patientName}</strong>
                          <span>{check.patientId}</span>
                        </div>
                      </td>
                      <td>{check.insuranceProvider}</td>
                      <td>{check.policyNumber}</td>
                      <td>
                        <span className="iev-check-type">
                          {check.checkType === 'real-time' ? <Zap size={14} /> : <Clock size={14} />}
                          {check.checkType}
                        </span>
                      </td>
                      <td>
                        <span 
                          className={`iev-status-badge ${check.status}`}
                          style={{ color: getStatusColor(check.status) }}
                        >
                          {getStatusIcon(check.status)}
                          {check.status}
                        </span>
                      </td>
                      <td>{check.timestamp.toLocaleString()}</td>
                      <td>
                        <button className="iev-action-btn">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="iev-rules">
            <h2>Coverage Rules & Requirements</h2>
            
            <div className="iev-rules-grid">
              <div className="iev-rule-card">
                <div className="iev-rule-icon">
                  <Heart size={24} />
                </div>
                <h3>Primary Care</h3>
                <ul>
                  <li>No referral required for in-network</li>
                  <li>$25-50 copay typical</li>
                  <li>Annual wellness visit covered 100%</li>
                  <li>Preventive care no cost share</li>
                </ul>
              </div>

              <div className="iev-rule-card">
                <div className="iev-rule-icon">
                  <Building size={24} />
                </div>
                <h3>Specialist Care</h3>
                <ul>
                  <li>Referral may be required</li>
                  <li>$40-80 copay typical</li>
                  <li>Prior auth for certain services</li>
                  <li>Out-of-network higher cost</li>
                </ul>
              </div>

              <div className="iev-rule-card">
                <div className="iev-rule-icon">
                  <Activity size={24} />
                </div>
                <h3>Emergency Services</h3>
                <ul>
                  <li>No prior authorization needed</li>
                  <li>$150-500 ER copay typical</li>
                  <li>Waived if admitted</li>
                  <li>Out-of-network covered as in-network</li>
                </ul>
              </div>

              <div className="iev-rule-card">
                <div className="iev-rule-icon">
                  <FileText size={24} />
                </div>
                <h3>Prior Authorization</h3>
                <ul>
                  <li>Required for high-cost procedures</li>
                  <li>72-hour response typical</li>
                  <li>Appeals process available</li>
                  <li>Expedited review for urgent</li>
                </ul>
              </div>
            </div>

            <div className="iev-common-denials">
              <h3>Common Denial Reasons</h3>
              <div className="iev-denial-list">
                <div className="iev-denial-item">
                  <AlertTriangle size={20} />
                  <div>
                    <h4>Invalid Member ID</h4>
                    <p>Ensure exact match with insurance card including leading zeros</p>
                  </div>
                </div>
                <div className="iev-denial-item">
                  <AlertTriangle size={20} />
                  <div>
                    <h4>DOB Mismatch</h4>
                    <p>Verify date format matches payer requirements (MM/DD/YYYY)</p>
                  </div>
                </div>
                <div className="iev-denial-item">
                  <AlertTriangle size={20} />
                  <div>
                    <h4>Terminated Coverage</h4>
                    <p>Check for recent employment changes or COBRA eligibility</p>
                  </div>
                </div>
                <div className="iev-denial-item">
                  <AlertTriangle size={20} />
                  <div>
                    <h4>Coordination of Benefits</h4>
                    <p>Verify primary vs secondary insurance order</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="iev-analytics">
            <h2>Eligibility Verification Analytics</h2>
            
            <div className="iev-analytics-grid">
              <div className="iev-analytics-card">
                <h3>Verification Performance</h3>
                <div className="iev-performance-stats">
                  <div className="iev-perf-stat">
                    <span className="iev-perf-label">Today</span>
                    <span className="iev-perf-value">{verificationStats.total}</span>
                    <span className="iev-perf-change positive">+12%</span>
                  </div>
                  <div className="iev-perf-stat">
                    <span className="iev-perf-label">This Week</span>
                    <span className="iev-perf-value">8,542</span>
                    <span className="iev-perf-change positive">+8%</span>
                  </div>
                  <div className="iev-perf-stat">
                    <span className="iev-perf-label">This Month</span>
                    <span className="iev-perf-value">32,156</span>
                    <span className="iev-perf-change negative">-3%</span>
                  </div>
                </div>
              </div>

              <div className="iev-analytics-card">
                <h3>Success Rate by Provider</h3>
                <div className="iev-provider-list">
                  {insuranceProviders.filter(p => p.apiEnabled).map(provider => (
                    <div key={provider.id} className="iev-provider-stat">
                      <div className="iev-provider-info">
                        <span className="iev-provider-name">{provider.name}</span>
                        <span className="iev-provider-time">{provider.avgResponseTime}s avg</span>
                      </div>
                      <div className="iev-provider-bar">
                        <div 
                          className="iev-provider-fill"
                          style={{ width: `${85 + Math.random() * 10}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="iev-analytics-card">
                <h3>Error Distribution</h3>
                <div className="iev-error-chart">
                  <div className="iev-error-stat">
                    <span className="iev-error-type">Invalid Policy</span>
                    <span className="iev-error-count">45%</span>
                  </div>
                  <div className="iev-error-stat">
                    <span className="iev-error-type">DOB Mismatch</span>
                    <span className="iev-error-count">28%</span>
                  </div>
                  <div className="iev-error-stat">
                    <span className="iev-error-type">Terminated</span>
                    <span className="iev-error-count">15%</span>
                  </div>
                  <div className="iev-error-stat">
                    <span className="iev-error-type">System Error</span>
                    <span className="iev-error-count">12%</span>
                  </div>
                </div>
              </div>

              <div className="iev-analytics-card">
                <h3>Financial Impact</h3>
                <div className="iev-financial-stats">
                  <div className="iev-financial-item">
                    <DollarSign size={20} />
                    <div>
                      <p className="iev-financial-label">Claims Prevented</p>
                      <p className="iev-financial-value">$1.2M</p>
                    </div>
                  </div>
                  <div className="iev-financial-item">
                    <TrendingUp size={20} />
                    <div>
                      <p className="iev-financial-label">Collections Improved</p>
                      <p className="iev-financial-value">+23%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="iev-insights">
              <h3>Key Insights</h3>
              <div className="iev-insights-list">
                <div className="iev-insight">
                  <CheckCircle size={20} />
                  <p>Real-time verification reduces claim denials by 78%</p>
                </div>
                <div className="iev-insight">
                  <AlertCircle size={20} />
                  <p>32% of manual verifications have data entry errors</p>
                </div>
                <div className="iev-insight">
                  <TrendingUp size={20} />
                  <p>Automated verification saves 45 minutes per patient on average</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

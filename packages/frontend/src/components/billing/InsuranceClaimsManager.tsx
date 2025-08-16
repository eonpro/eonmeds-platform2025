import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Search,
  Filter,
  Download,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Send,
  Edit,
  Eye,
  Printer,
  BarChart
} from 'lucide-react';
import './InsuranceClaimsManager.css';

interface Claim {
  id: string;
  claimNumber: string;
  patient: {
    name: string;
    id: string;
    dob: string;
  };
  insurance: {
    company: string;
    policyNumber: string;
    groupNumber: string;
  };
  provider: {
    name: string;
    npi: string;
  };
  serviceDate: string;
  submittedDate: string;
  status: 'draft' | 'submitted' | 'pending' | 'approved' | 'denied' | 'appeal';
  amount: {
    billed: number;
    allowed: number;
    paid: number;
    patientResponsibility: number;
  };
  cptCodes: Array<{
    code: string;
    description: string;
    units: number;
    amount: number;
  }>;
  icd10Codes: string[];
  denialReason?: string;
  notes?: string;
}

export const InsuranceClaimsManager: React.FC = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [activeView, setActiveView] = useState<'list' | 'detail' | 'new'>('list');
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: 'last30',
    insurance: 'all'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading claims
    setTimeout(() => {
      setClaims([
        {
          id: '1',
          claimNumber: 'CLM-2024-001234',
          patient: {
            name: 'John Doe',
            id: 'PT-0001',
            dob: '1985-03-15'
          },
          insurance: {
            company: 'Blue Cross Blue Shield',
            policyNumber: 'BC123456789',
            groupNumber: 'GRP001'
          },
          provider: {
            name: 'Dr. Sarah Johnson',
            npi: '1234567890'
          },
          serviceDate: '2024-11-10',
          submittedDate: '2024-11-12',
          status: 'pending',
          amount: {
            billed: 1250.00,
            allowed: 1000.00,
            paid: 0,
            patientResponsibility: 250.00
          },
          cptCodes: [
            { code: '99213', description: 'Office visit, established patient', units: 1, amount: 250 },
            { code: '80053', description: 'Comprehensive metabolic panel', units: 1, amount: 150 },
            { code: '83036', description: 'Hemoglobin A1C', units: 1, amount: 100 }
          ],
          icd10Codes: ['E11.9', 'I10']
        },
        {
          id: '2',
          claimNumber: 'CLM-2024-001235',
          patient: {
            name: 'Jane Smith',
            id: 'PT-0002',
            dob: '1972-08-22'
          },
          insurance: {
            company: 'Aetna',
            policyNumber: 'AET987654321',
            groupNumber: 'GRP002'
          },
          provider: {
            name: 'Dr. Michael Chen',
            npi: '0987654321'
          },
          serviceDate: '2024-11-08',
          submittedDate: '2024-11-09',
          status: 'denied',
          amount: {
            billed: 3500.00,
            allowed: 0,
            paid: 0,
            patientResponsibility: 3500.00
          },
          cptCodes: [
            { code: '45380', description: 'Colonoscopy', units: 1, amount: 3500 }
          ],
          icd10Codes: ['K57.30'],
          denialReason: 'Prior authorization required'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusIcon = (status: Claim['status']) => {
    switch (status) {
      case 'approved':
        return <CheckCircle size={16} />;
      case 'denied':
        return <XCircle size={16} />;
      case 'pending':
      case 'submitted':
        return <Clock size={16} />;
      case 'appeal':
        return <RefreshCw size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  const getStatusColor = (status: Claim['status']) => {
    switch (status) {
      case 'approved':
        return 'status-approved';
      case 'denied':
        return 'status-denied';
      case 'pending':
      case 'submitted':
        return 'status-pending';
      case 'appeal':
        return 'status-appeal';
      default:
        return 'status-draft';
    }
  };

  if (loading) {
    return (
      <div className="icm-loading">
        <div className="icm-spinner"></div>
        <p>Loading insurance claims...</p>
      </div>
    );
  }

  return (
    <div className="insurance-claims-manager">
      {/* Header */}
      <div className="icm-header">
        <div className="icm-header-content">
          <h1>Insurance Claims Management</h1>
          <p>Submit, track, and manage insurance claims efficiently</p>
        </div>
        <div className="icm-header-actions">
          <button className="icm-btn icm-btn-secondary">
            <Upload size={16} />
            Import Claims
          </button>
          <button 
            className="icm-btn icm-btn-primary"
            onClick={() => setActiveView('new')}
          >
            <FileText size={16} />
            New Claim
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="icm-stats-grid">
        <div className="icm-stat-card">
          <div className="icm-stat-icon pending">
            <Clock size={24} />
          </div>
          <div className="icm-stat-content">
            <p className="icm-stat-label">Pending Claims</p>
            <p className="icm-stat-value">23</p>
            <p className="icm-stat-amount">$45,230</p>
          </div>
        </div>
        <div className="icm-stat-card">
          <div className="icm-stat-icon approved">
            <CheckCircle size={24} />
          </div>
          <div className="icm-stat-content">
            <p className="icm-stat-label">Approved This Month</p>
            <p className="icm-stat-value">156</p>
            <p className="icm-stat-amount">$234,560</p>
          </div>
        </div>
        <div className="icm-stat-card">
          <div className="icm-stat-icon denied">
            <XCircle size={24} />
          </div>
          <div className="icm-stat-content">
            <p className="icm-stat-label">Denied Claims</p>
            <p className="icm-stat-value">8</p>
            <p className="icm-stat-amount">$12,340</p>
          </div>
        </div>
        <div className="icm-stat-card">
          <div className="icm-stat-icon appeal">
            <RefreshCw size={24} />
          </div>
          <div className="icm-stat-content">
            <p className="icm-stat-label">Under Appeal</p>
            <p className="icm-stat-value">5</p>
            <p className="icm-stat-amount">$8,900</p>
          </div>
        </div>
      </div>

      {activeView === 'list' && (
        <>
          {/* Filters and Search */}
          <div className="icm-controls">
            <div className="icm-search">
              <Search size={20} />
              <input
                type="text"
                placeholder="Search by claim number, patient, or provider..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="icm-filters">
              <select 
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="icm-filter-select"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="denied">Denied</option>
                <option value="appeal">Appeal</option>
              </select>
              <select 
                value={filters.dateRange}
                onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                className="icm-filter-select"
              >
                <option value="last7">Last 7 days</option>
                <option value="last30">Last 30 days</option>
                <option value="last90">Last 90 days</option>
                <option value="custom">Custom Range</option>
              </select>
              <button className="icm-btn icm-btn-text">
                <Filter size={16} />
                More Filters
              </button>
            </div>
          </div>

          {/* Claims Table */}
          <div className="icm-claims-table">
            <table>
              <thead>
                <tr>
                  <th>Claim #</th>
                  <th>Patient</th>
                  <th>Insurance</th>
                  <th>Service Date</th>
                  <th>Status</th>
                  <th>Billed</th>
                  <th>Paid</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {claims.map(claim => (
                  <tr key={claim.id}>
                    <td className="icm-claim-number">
                      <a href="#" onClick={(e) => {
                        e.preventDefault();
                        setSelectedClaim(claim);
                        setActiveView('detail');
                      }}>
                        {claim.claimNumber}
                      </a>
                    </td>
                    <td>
                      <div className="icm-patient-info">
                        <p>{claim.patient.name}</p>
                        <span>DOB: {new Date(claim.patient.dob).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td>
                      <div className="icm-insurance-info">
                        <p>{claim.insurance.company}</p>
                        <span>Policy: {claim.insurance.policyNumber}</span>
                      </div>
                    </td>
                    <td>{new Date(claim.serviceDate).toLocaleDateString()}</td>
                    <td>
                      <span className={`icm-status-badge ${getStatusColor(claim.status)}`}>
                        {getStatusIcon(claim.status)}
                        {claim.status}
                      </span>
                    </td>
                    <td className="icm-amount">${claim.amount.billed.toFixed(2)}</td>
                    <td className="icm-amount">${claim.amount.paid.toFixed(2)}</td>
                    <td className="icm-actions">
                      <button className="icm-action-btn" title="View Details">
                        <Eye size={16} />
                      </button>
                      <button className="icm-action-btn" title="Edit">
                        <Edit size={16} />
                      </button>
                      <button className="icm-action-btn" title="Print">
                        <Printer size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Quick Actions */}
          <div className="icm-quick-actions">
            <div className="icm-quick-action-card">
              <AlertCircle size={24} className="icm-action-icon warning" />
              <h3>Claims Requiring Action</h3>
              <p>8 claims need additional information</p>
              <button className="icm-btn icm-btn-secondary">
                Review Now
              </button>
            </div>
            <div className="icm-quick-action-card">
              <Send size={24} className="icm-action-icon info" />
              <h3>Ready to Submit</h3>
              <p>12 claims ready for submission</p>
              <button className="icm-btn icm-btn-primary">
                Submit Batch
              </button>
            </div>
            <div className="icm-quick-action-card">
              <BarChart size={24} className="icm-action-icon success" />
              <h3>Analytics</h3>
              <p>View claim performance metrics</p>
              <button className="icm-btn icm-btn-secondary">
                View Report
              </button>
            </div>
          </div>
        </>
      )}

      {activeView === 'detail' && selectedClaim && (
        <div className="icm-claim-detail">
          <div className="icm-detail-header">
            <button 
              className="icm-back-btn"
              onClick={() => setActiveView('list')}
            >
              ← Back to Claims
            </button>
            <div className="icm-detail-actions">
              <button className="icm-btn icm-btn-text">
                <Printer size={16} />
                Print
              </button>
              <button className="icm-btn icm-btn-text">
                <Download size={16} />
                Export
              </button>
              <button className="icm-btn icm-btn-primary">
                <Edit size={16} />
                Edit Claim
              </button>
            </div>
          </div>

          <div className="icm-detail-content">
            <div className="icm-detail-section">
              <h2>Claim Information</h2>
              <div className="icm-info-grid">
                <div className="icm-info-item">
                  <label>Claim Number</label>
                  <p>{selectedClaim.claimNumber}</p>
                </div>
                <div className="icm-info-item">
                  <label>Status</label>
                  <span className={`icm-status-badge ${getStatusColor(selectedClaim.status)}`}>
                    {getStatusIcon(selectedClaim.status)}
                    {selectedClaim.status}
                  </span>
                </div>
                <div className="icm-info-item">
                  <label>Service Date</label>
                  <p>{new Date(selectedClaim.serviceDate).toLocaleDateString()}</p>
                </div>
                <div className="icm-info-item">
                  <label>Submitted Date</label>
                  <p>{new Date(selectedClaim.submittedDate).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <div className="icm-detail-section">
              <h2>Patient Information</h2>
              <div className="icm-info-grid">
                <div className="icm-info-item">
                  <label>Name</label>
                  <p>{selectedClaim.patient.name}</p>
                </div>
                <div className="icm-info-item">
                  <label>Patient ID</label>
                  <p>{selectedClaim.patient.id}</p>
                </div>
                <div className="icm-info-item">
                  <label>Date of Birth</label>
                  <p>{new Date(selectedClaim.patient.dob).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <div className="icm-detail-section">
              <h2>Services & Diagnosis</h2>
              <div className="icm-services-table">
                <table>
                  <thead>
                    <tr>
                      <th>CPT Code</th>
                      <th>Description</th>
                      <th>Units</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedClaim.cptCodes.map((cpt, index) => (
                      <tr key={index}>
                        <td>{cpt.code}</td>
                        <td>{cpt.description}</td>
                        <td>{cpt.units}</td>
                        <td>${cpt.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="icm-diagnosis">
                <label>ICD-10 Codes</label>
                <p>{selectedClaim.icd10Codes.join(', ')}</p>
              </div>
            </div>

            <div className="icm-detail-section">
              <h2>Financial Summary</h2>
              <div className="icm-financial-summary">
                <div className="icm-summary-item">
                  <span>Billed Amount</span>
                  <span>${selectedClaim.amount.billed.toFixed(2)}</span>
                </div>
                <div className="icm-summary-item">
                  <span>Allowed Amount</span>
                  <span>${selectedClaim.amount.allowed.toFixed(2)}</span>
                </div>
                <div className="icm-summary-item">
                  <span>Insurance Paid</span>
                  <span>${selectedClaim.amount.paid.toFixed(2)}</span>
                </div>
                <div className="icm-summary-item total">
                  <span>Patient Responsibility</span>
                  <span>${selectedClaim.amount.patientResponsibility.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {selectedClaim.denialReason && (
              <div className="icm-detail-section icm-denial-section">
                <h2>Denial Information</h2>
                <div className="icm-denial-info">
                  <AlertCircle size={20} />
                  <p>{selectedClaim.denialReason}</p>
                </div>
                <button className="icm-btn icm-btn-primary">
                  <RefreshCw size={16} />
                  File Appeal
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

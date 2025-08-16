import React, { useState, useEffect } from 'react';
import { 
  FileStack,
  Upload,
  Download,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Filter,
  Settings,
  Zap,
  TrendingUp,
  Calendar,
  CreditCard,
  Send,
  Archive
} from 'lucide-react';
import './BatchOperations.css';

interface BatchOperation {
  id: string;
  type: 'invoice_generation' | 'payment_processing' | 'claim_submission' | 'statement_sending' | 'eligibility_check';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  totalItems: number;
  processedItems: number;
  successCount: number;
  failureCount: number;
  startTime: Date;
  endTime?: Date;
  errors: string[];
}

interface BatchTemplate {
  id: string;
  name: string;
  type: string;
  filters: any;
  lastUsed: Date;
  successRate: number;
}

export const BatchOperations: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'operations' | 'templates' | 'history'>('operations');
  const [operations, setOperations] = useState<BatchOperation[]>([]);
  const [selectedOperation, setSelectedOperation] = useState<string>('invoice_generation');
  const [filters, setFilters] = useState({
    dateRange: 'last30',
    status: 'all',
    insurance: 'all',
    minBalance: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Mock data for demonstration
  const mockPatients = [
    { id: '1', name: 'John Doe', balance: 250, insurance: 'BCBS', lastVisit: '2024-11-15' },
    { id: '2', name: 'Jane Smith', balance: 150, insurance: 'Aetna', lastVisit: '2024-11-10' },
    { id: '3', name: 'Robert Johnson', balance: 500, insurance: 'United', lastVisit: '2024-11-20' },
    { id: '4', name: 'Maria Garcia', balance: 75, insurance: 'Cigna', lastVisit: '2024-11-18' },
    { id: '5', name: 'David Lee', balance: 300, insurance: 'BCBS', lastVisit: '2024-11-12' }
  ];

  const operationTypes = [
    {
      id: 'invoice_generation',
      name: 'Bulk Invoice Generation',
      icon: <FileStack size={20} />,
      description: 'Generate invoices for multiple patients at once',
      color: '#3B82F6'
    },
    {
      id: 'payment_processing',
      name: 'Batch Payment Processing',
      icon: <CreditCard size={20} />,
      description: 'Process payments from insurance or patient batches',
      color: '#10B981'
    },
    {
      id: 'claim_submission',
      name: 'Mass Claim Submission',
      icon: <Send size={20} />,
      description: 'Submit multiple insurance claims simultaneously',
      color: '#8B5CF6'
    },
    {
      id: 'statement_sending',
      name: 'Statement Distribution',
      icon: <Send size={20} />,
      description: 'Send patient statements via email or mail',
      color: '#F59E0B'
    },
    {
      id: 'eligibility_check',
      name: 'Insurance Eligibility Verification',
      icon: <CheckCircle size={20} />,
      description: 'Verify insurance eligibility for multiple patients',
      color: '#EF4444'
    }
  ];

  const templates: BatchTemplate[] = [
    {
      id: '1',
      name: 'Monthly Invoice Run',
      type: 'invoice_generation',
      filters: { dateRange: 'lastMonth', minBalance: 50 },
      lastUsed: new Date('2024-11-01'),
      successRate: 98.5
    },
    {
      id: '2',
      name: 'Daily Insurance Claims',
      type: 'claim_submission',
      filters: { dateRange: 'yesterday', insurance: 'all' },
      lastUsed: new Date('2024-11-29'),
      successRate: 95.2
    },
    {
      id: '3',
      name: 'Overdue Statement Batch',
      type: 'statement_sending',
      filters: { minBalance: 100, daysOverdue: 30 },
      lastUsed: new Date('2024-11-15'),
      successRate: 99.1
    }
  ];

  const startBatchOperation = () => {
    if (selectedItems.length === 0) {
      alert('Please select items to process');
      return;
    }

    setIsProcessing(true);
    const newOperation: BatchOperation = {
      id: Date.now().toString(),
      type: selectedOperation as any,
      status: 'processing',
      totalItems: selectedItems.length,
      processedItems: 0,
      successCount: 0,
      failureCount: 0,
      startTime: new Date(),
      errors: []
    };

    setOperations([newOperation, ...operations]);

    // Simulate batch processing
    let processed = 0;
    const interval = setInterval(() => {
      processed += Math.floor(Math.random() * 3) + 1;
      if (processed >= selectedItems.length) {
        processed = selectedItems.length;
        clearInterval(interval);
        setIsProcessing(false);
        
        // Update operation status
        setOperations(prev => prev.map(op => 
          op.id === newOperation.id 
            ? {
                ...op,
                status: 'completed',
                processedItems: processed,
                successCount: processed - 1,
                failureCount: 1,
                endTime: new Date()
              }
            : op
        ));
      } else {
        // Update progress
        setOperations(prev => prev.map(op => 
          op.id === newOperation.id 
            ? {
                ...op,
                processedItems: processed,
                successCount: processed - Math.floor(processed * 0.05),
                failureCount: Math.floor(processed * 0.05)
              }
            : op
        ));
      }
    }, 500);
  };

  const getOperationProgress = (operation: BatchOperation) => {
    if (operation.totalItems === 0) return 0;
    return (operation.processedItems / operation.totalItems) * 100;
  };

  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end || new Date();
    const duration = endTime.getTime() - start.getTime();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="batch-operations">
      {/* Header */}
      <div className="bo-header">
        <div className="bo-header-content">
          <h1>Batch Operations Center</h1>
          <p>Process multiple billing tasks efficiently with bulk operations</p>
        </div>
        <div className="bo-header-actions">
          <button className="bo-btn bo-btn-secondary">
            <Upload size={16} />
            Import CSV
          </button>
          <button className="bo-btn bo-btn-secondary">
            <Download size={16} />
            Export Results
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bo-tabs">
        <button 
          className={`bo-tab ${activeTab === 'operations' ? 'active' : ''}`}
          onClick={() => setActiveTab('operations')}
        >
          <Zap size={16} />
          New Operation
        </button>
        <button 
          className={`bo-tab ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          <FileStack size={16} />
          Templates
        </button>
        <button 
          className={`bo-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <Archive size={16} />
          History
        </button>
      </div>

      {/* Content */}
      <div className="bo-content">
        {activeTab === 'operations' && (
          <div className="bo-operations">
            {/* Operation Selection */}
            <div className="bo-operation-selector">
              <h2>Select Operation Type</h2>
              <div className="bo-operation-grid">
                {operationTypes.map(type => (
                  <div 
                    key={type.id}
                    className={`bo-operation-card ${selectedOperation === type.id ? 'active' : ''}`}
                    onClick={() => setSelectedOperation(type.id)}
                    style={{ borderColor: selectedOperation === type.id ? type.color : 'transparent' }}
                  >
                    <div className="bo-operation-icon" style={{ backgroundColor: type.color + '20', color: type.color }}>
                      {type.icon}
                    </div>
                    <h3>{type.name}</h3>
                    <p>{type.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="bo-filters-section">
              <h2>Filter Criteria</h2>
              <div className="bo-filters">
                <div className="bo-filter-group">
                  <label>Date Range</label>
                  <select 
                    value={filters.dateRange}
                    onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                  >
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="last7">Last 7 days</option>
                    <option value="last30">Last 30 days</option>
                    <option value="lastMonth">Last Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>

                <div className="bo-filter-group">
                  <label>Insurance Provider</label>
                  <select 
                    value={filters.insurance}
                    onChange={(e) => setFilters({...filters, insurance: e.target.value})}
                  >
                    <option value="all">All Providers</option>
                    <option value="bcbs">Blue Cross Blue Shield</option>
                    <option value="aetna">Aetna</option>
                    <option value="united">United Healthcare</option>
                    <option value="cigna">Cigna</option>
                  </select>
                </div>

                <div className="bo-filter-group">
                  <label>Minimum Balance</label>
                  <input 
                    type="number"
                    placeholder="0.00"
                    value={filters.minBalance}
                    onChange={(e) => setFilters({...filters, minBalance: e.target.value})}
                  />
                </div>

                <button className="bo-btn bo-btn-text">
                  <Settings size={16} />
                  Advanced Filters
                </button>
              </div>
            </div>

            {/* Preview */}
            <div className="bo-preview-section">
              <div className="bo-preview-header">
                <h2>Preview Selection</h2>
                <div className="bo-preview-stats">
                  <span>{selectedItems.length} items selected</span>
                  <span>•</span>
                  <span>Est. processing time: {Math.ceil(selectedItems.length * 0.5)}s</span>
                </div>
              </div>

              <div className="bo-preview-table">
                <table>
                  <thead>
                    <tr>
                      <th>
                        <input 
                          type="checkbox"
                          checked={selectedItems.length === mockPatients.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedItems(mockPatients.map(p => p.id));
                            } else {
                              setSelectedItems([]);
                            }
                          }}
                        />
                      </th>
                      <th>Patient</th>
                      <th>Balance</th>
                      <th>Insurance</th>
                      <th>Last Visit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockPatients.map(patient => (
                      <tr key={patient.id}>
                        <td>
                          <input 
                            type="checkbox"
                            checked={selectedItems.includes(patient.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedItems([...selectedItems, patient.id]);
                              } else {
                                setSelectedItems(selectedItems.filter(id => id !== patient.id));
                              }
                            }}
                          />
                        </td>
                        <td>{patient.name}</td>
                        <td>${patient.balance}</td>
                        <td>{patient.insurance}</td>
                        <td>{patient.lastVisit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bo-action-bar">
                <div className="bo-action-info">
                  <AlertCircle size={16} />
                  <span>This operation will process {selectedItems.length} items</span>
                </div>
                <button 
                  className="bo-btn bo-btn-primary"
                  onClick={startBatchOperation}
                  disabled={isProcessing || selectedItems.length === 0}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={16} className="bo-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                      Start Batch Operation
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Active Operations */}
            {operations.length > 0 && (
              <div className="bo-active-operations">
                <h2>Active Operations</h2>
                {operations.slice(0, 3).map(operation => (
                  <div key={operation.id} className={`bo-operation-status ${operation.status}`}>
                    <div className="bo-operation-header">
                      <div className="bo-operation-info">
                        <h4>{operationTypes.find(t => t.id === operation.type)?.name}</h4>
                        <p>{operation.totalItems} items • Started {formatDuration(operation.startTime)} ago</p>
                      </div>
                      <div className={`bo-status-badge ${operation.status}`}>
                        {operation.status === 'processing' && <RefreshCw size={14} className="bo-spin" />}
                        {operation.status === 'completed' && <CheckCircle size={14} />}
                        {operation.status === 'failed' && <XCircle size={14} />}
                        {operation.status === 'partial' && <AlertCircle size={14} />}
                        {operation.status}
                      </div>
                    </div>

                    <div className="bo-progress-bar">
                      <div 
                        className="bo-progress-fill"
                        style={{ width: `${getOperationProgress(operation)}%` }}
                      ></div>
                    </div>

                    <div className="bo-operation-stats">
                      <div className="bo-stat">
                        <CheckCircle size={14} />
                        <span>{operation.successCount} Success</span>
                      </div>
                      <div className="bo-stat">
                        <XCircle size={14} />
                        <span>{operation.failureCount} Failed</span>
                      </div>
                      <div className="bo-stat">
                        <TrendingUp size={14} />
                        <span>{getOperationProgress(operation).toFixed(0)}% Complete</span>
                      </div>
                    </div>

                    {operation.status === 'processing' && (
                      <button className="bo-btn bo-btn-text bo-cancel">
                        <Pause size={14} />
                        Pause
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="bo-templates">
            <div className="bo-templates-header">
              <h2>Saved Templates</h2>
              <button className="bo-btn bo-btn-primary">
                <FileStack size={16} />
                Create Template
              </button>
            </div>

            <div className="bo-template-grid">
              {templates.map(template => (
                <div key={template.id} className="bo-template-card">
                  <div className="bo-template-header">
                    <h3>{template.name}</h3>
                    <div className="bo-template-success">
                      <TrendingUp size={16} />
                      {template.successRate}% success
                    </div>
                  </div>
                  
                  <div className="bo-template-info">
                    <p className="bo-template-type">
                      {operationTypes.find(t => t.id === template.type)?.name}
                    </p>
                    <p className="bo-template-last">
                      Last used: {template.lastUsed.toLocaleDateString()}
                    </p>
                  </div>

                  <div className="bo-template-filters">
                    {Object.entries(template.filters).map(([key, value]) => (
                      <span key={key} className="bo-filter-tag">
                        {key}: {value}
                      </span>
                    ))}
                  </div>

                  <div className="bo-template-actions">
                    <button className="bo-btn bo-btn-secondary">
                      <Play size={16} />
                      Use Template
                    </button>
                    <button className="bo-btn bo-btn-text">
                      <Settings size={16} />
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bo-history">
            <div className="bo-history-header">
              <h2>Operation History</h2>
              <div className="bo-history-filters">
                <select>
                  <option>All Operations</option>
                  <option>Invoice Generation</option>
                  <option>Payment Processing</option>
                  <option>Claim Submission</option>
                </select>
                <input type="date" />
                <button className="bo-btn bo-btn-text">
                  <Filter size={16} />
                  Filter
                </button>
              </div>
            </div>

            <div className="bo-history-table">
              <table>
                <thead>
                  <tr>
                    <th>Operation</th>
                    <th>Date</th>
                    <th>Items</th>
                    <th>Success Rate</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {operations.filter(op => op.status !== 'processing').map(operation => (
                    <tr key={operation.id}>
                      <td>{operationTypes.find(t => t.id === operation.type)?.name}</td>
                      <td>{operation.startTime.toLocaleString()}</td>
                      <td>{operation.totalItems}</td>
                      <td>
                        <span className="bo-success-rate">
                          {operation.totalItems > 0 
                            ? ((operation.successCount / operation.totalItems) * 100).toFixed(1)
                            : 0}%
                        </span>
                      </td>
                      <td>{formatDuration(operation.startTime, operation.endTime)}</td>
                      <td>
                        <span className={`bo-status-badge ${operation.status}`}>
                          {operation.status}
                        </span>
                      </td>
                      <td>
                        <button className="bo-btn bo-btn-text">
                          <Download size={14} />
                          Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

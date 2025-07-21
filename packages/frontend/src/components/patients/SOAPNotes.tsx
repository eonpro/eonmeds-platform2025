import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { LoadingSpinner } from '../common/LoadingSpinner';
import BeccaAIModal from '../ai/BeccaAIModal';
import { useAuth } from '../../hooks/useAuth';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { ConfirmDialog } from '../common/ConfirmDialog';
import './SOAPNotes.css';

interface SOAPNote {
  id: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  approved_at?: string;
  approved_by_name?: string;
  approved_by_credentials?: string;
  version: number;
}

interface SOAPNotesProps {
  patientId: string;
  patientName: string;
  onSOAPCreated?: (noteDate: string) => void;
}

export const SOAPNotes: React.FC<SOAPNotesProps> = ({ patientId, patientName, onSOAPCreated }) => {
  const api = useApi();
  const { user } = useAuth();
  const [soapNotes, setSoapNotes] = useState<SOAPNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [beccaStatus, setBeccaStatus] = useState<'idle' | 'analyzing' | 'creating' | 'ready'>('idle');
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    noteId: '',
    onConfirm: () => {}
  });
  
  // Check if user can delete SOAP notes
  const canDelete = user?.role === 'admin' || user?.role === 'doctor' || user?.role === 'superadmin';

  // Fetch existing SOAP notes
  const fetchSOAPNotes = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/v1/ai/soap-notes/${patientId}`);
      setSoapNotes(response.data.soapNotes || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching SOAP notes:', err);
      setError('Failed to load SOAP notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSOAPNotes();
  }, [patientId]);

  // Generate new SOAP note
  const handleGenerateSOAP = async () => {
    setGenerating(true);
    setError(null);
    setBeccaStatus('analyzing');
    
    try {
      // Simulate analyzing phase
      await new Promise(resolve => setTimeout(resolve, 2000));
      setBeccaStatus('creating');
      
      const response = await api.post(`/api/v1/ai/generate-soap/${patientId}`);
      
      if (response.data.success) {
        setBeccaStatus('ready');
        // Wait 2 seconds before refreshing to show the success state
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Refresh the list to show the new note
        await fetchSOAPNotes();
        // Notify parent component about new SOAP note
        const today = new Date().toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric'
        });
        if (onSOAPCreated) {
          onSOAPCreated(today);
        }
      } else {
        setError(response.data.error || 'Failed to generate SOAP note');
        setBeccaStatus('idle');
      }
    } catch (err: any) {
      console.error('Error generating SOAP note:', err);
      setBeccaStatus('idle');
      
      if (err.response?.status === 503) {
        setError('BECCA AI is not configured. Please contact your administrator to set up the AI service.');
      } else {
        setError(err.response?.data?.error || 'Failed to generate SOAP note');
      }
    } finally {
      setGenerating(false);
    }
  };

  // Delete SOAP note
  const handleDeleteNote = (noteId: string) => {
    setConfirmDialog({
      isOpen: true,
      noteId,
      onConfirm: async () => {
        try {
          await api.delete(`/api/v1/ai/soap-notes/${noteId}`);
          // Refresh the list
          await fetchSOAPNotes();
          setError(null);
        } catch (err: any) {
          console.error('Error deleting SOAP note:', err);
          setError(err.response?.data?.error || 'Failed to delete SOAP note');
        }
        setConfirmDialog({ ...confirmDialog, isOpen: false });
      }
    });
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge
  const getStatusBadge = (note: SOAPNote) => {
    switch (note.status) {
      case 'approved':
        return (
          <span className="status-badge approved">
            Approved by {note.approved_by_name} {note.approved_by_credentials}
          </span>
        );
      case 'rejected':
        return <span className="status-badge rejected">Rejected</span>;
      default:
        return <span className="status-badge pending">Pending Provider Approval</span>;
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <BeccaAIModal 
        isOpen={generating}
        status={beccaStatus}
        patientName={patientName}
        onClose={() => setBeccaStatus('idle')}
      />
      
      <div className="soap-notes-container">
        <div className="soap-header">
          <h2>SOAP Notes</h2>
          <button 
            className="generate-soap-btn"
            onClick={handleGenerateSOAP}
            disabled={generating}
          >
            <div className="generate-btn-content">
              <span className="generate-btn-text">
                {generating ? 'Generating new SOAP with' : 'Generate a new SOAP with'}
              </span>
              <div className="becca-orb-icon">
                <DotLottieReact
                  src="https://lottie.host/9c7564a3-b6ee-4e8b-8b5e-14a59b28c515/3Htnjbp08p.lottie"
                  loop
                  autoplay
                />
              </div>
              <span className="becca-text">Becca.<span className="ai-text">AI</span></span>
            </div>
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {soapNotes.length === 0 ? (
          <div className="empty-state">
            <h3>No SOAP Notes Yet</h3>
            <p>Click "Generate SOAP Note with BECCA AI" to<br />create the first SOAP note from the patient's<br />intake form.</p>
          </div>
        ) : (
          <div className="soap-notes-list">
            {soapNotes.map((note) => (
              <div key={note.id} className="soap-note-card">
                <div className="soap-note-header">
                  <div className="note-meta">
                    <span className="created-date">
                      Created: {formatDate(note.created_at)}
                    </span>
                    {note.version > 1 && (
                      <span className="version">v{note.version}</span>
                    )}
                  </div>
                  <div className="note-actions">
                    {getStatusBadge(note)}
                    {canDelete && note.status !== 'approved' && (
                      <button 
                        className="delete-note-btn"
                        onClick={() => handleDeleteNote(note.id)}
                        title="Delete SOAP Note"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 0 1 1.334-1.334h2.666a1.333 1.333 0 0 1 1.334 1.334V4m2 0v9.333a1.333 1.333 0 0 1-1.334 1.334H4.667a1.333 1.333 0 0 1-1.334-1.334V4h9.334z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="soap-note-content">
                  <pre>{note.content}</pre>
                </div>

                {note.approved_at && (
                  <div className="approval-info">
                    Approved on {formatDate(note.approved_at)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete SOAP Note"
        message="Are you sure you want to delete this SOAP note?"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        type="danger"
      />
    </>
  );
}; 
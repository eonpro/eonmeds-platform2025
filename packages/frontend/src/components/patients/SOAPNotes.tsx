import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import LoadingSpinner from '../common/LoadingSpinner';
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
}

export const SOAPNotes: React.FC<SOAPNotesProps> = ({ patientId, patientName }) => {
  const api = useApi();
  const [soapNotes, setSoapNotes] = useState<SOAPNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing SOAP notes
  const fetchSOAPNotes = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/ai/soap-notes/${patientId}`);
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
    
    try {
      const response = await api.post(`/ai/generate-soap/${patientId}`);
      
      if (response.data.success) {
        // Refresh the list to show the new note
        await fetchSOAPNotes();
      } else {
        setError(response.data.error || 'Failed to generate SOAP note');
      }
    } catch (err: any) {
      console.error('Error generating SOAP note:', err);
      
      if (err.response?.status === 503) {
        setError('BECCA AI is not configured. Please contact your administrator to set up the AI service.');
      } else {
        setError(err.response?.data?.error || 'Failed to generate SOAP note');
      }
    } finally {
      setGenerating(false);
    }
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
            ✓ Approved by {note.approved_by_name} {note.approved_by_credentials}
          </span>
        );
      case 'rejected':
        return <span className="status-badge rejected">✗ Rejected</span>;
      default:
        return <span className="status-badge pending">⏳ Pending Provider Approval</span>;
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="soap-notes-container">
      <div className="soap-header">
        <h2>SOAP Notes - {patientName}</h2>
        <button 
          className="generate-soap-btn"
          onClick={handleGenerateSOAP}
          disabled={generating}
        >
          {generating ? (
            <>
              <span className="becca-icon">🤖</span>
              Generating with BECCA AI...
            </>
          ) : (
            <>
              <span className="becca-icon">🤖</span>
              Generate SOAP Note with BECCA AI
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span>⚠️</span> {error}
        </div>
      )}

      {soapNotes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No SOAP Notes Yet</h3>
          <p>Click "Generate SOAP Note with BECCA AI" to create the first SOAP note from the patient's intake form.</p>
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
                {getStatusBadge(note)}
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
  );
}; 
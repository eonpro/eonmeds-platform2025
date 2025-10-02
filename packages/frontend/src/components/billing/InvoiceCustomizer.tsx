import React, { useState, useRef } from 'react';
import { 
  Palette, 
  Type, 
  Upload, 
  Download,
  Eye,
  Save,
  Settings,
  Image,
  FileText,
  X,
  Plus,
  Move,
  Edit2,
  Check
} from 'lucide-react';
import './InvoiceCustomizer.css';

interface InvoiceTemplate {
  id: string;
  name: string;
  logo?: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
  };
  header: {
    showLogo: boolean;
    showPracticeName: boolean;
    showAddress: boolean;
    showContact: boolean;
    customText?: string;
  };
  sections: Array<{
    id: string;
    type: 'patient' | 'provider' | 'services' | 'insurance' | 'payment' | 'custom';
    title: string;
    visible: boolean;
    order: number;
    fields?: Array<{
      label: string;
      value: string;
      type: 'text' | 'number' | 'date';
    }>;
  }>;
  footer: {
    showPaymentInstructions: boolean;
    showTerms: boolean;
    customMessage?: string;
    showSocialMedia: boolean;
  };
  branding: {
    fontFamily: string;
    fontSize: 'small' | 'medium' | 'large';
    layout: 'modern' | 'classic' | 'minimal';
  };
}

export const InvoiceCustomizer: React.FC = () => {
  const [activeTemplate, setActiveTemplate] = useState<InvoiceTemplate>({
    id: '1',
    name: 'Default Template',
    colors: {
      primary: '#3B82F6',
      secondary: '#1F2937',
      accent: '#10B981',
      text: '#374151'
    },
    header: {
      showLogo: true,
      showPracticeName: true,
      showAddress: true,
      showContact: true
    },
    sections: [
      { id: '1', type: 'patient', title: 'Patient Information', visible: true, order: 1 },
      { id: '2', type: 'provider', title: 'Provider Details', visible: true, order: 2 },
      { id: '3', type: 'services', title: 'Services Rendered', visible: true, order: 3 },
      { id: '4', type: 'insurance', title: 'Insurance Information', visible: true, order: 4 },
      { id: '5', type: 'payment', title: 'Payment Summary', visible: true, order: 5 }
    ],
    footer: {
      showPaymentInstructions: true,
      showTerms: true,
      showSocialMedia: false
    },
    branding: {
      fontFamily: 'Inter',
      fontSize: 'medium',
      layout: 'modern'
    }
  });

  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleColorChange = (colorType: keyof typeof activeTemplate.colors, value: string) => {
    setActiveTemplate({
      ...activeTemplate,
      colors: {
        ...activeTemplate.colors,
        [colorType]: value
      }
    });
  };

  const handleSectionToggle = (sectionId: string) => {
    setActiveTemplate({
      ...activeTemplate,
      sections: activeTemplate.sections.map(section =>
        section.id === sectionId ? { ...section, visible: !section.visible } : section
      )
    });
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setActiveTemplate({
          ...activeTemplate,
          logo: e.target?.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const addCustomSection = () => {
    const newSection = {
      id: Date.now().toString(),
      type: 'custom' as const,
      title: 'Custom Section',
      visible: true,
      order: activeTemplate.sections.length + 1,
      fields: []
    };
    setActiveTemplate({
      ...activeTemplate,
      sections: [...activeTemplate.sections, newSection]
    });
  };

  return (
    <div className="invoice-customizer">
      {/* Header */}
      <div className="ic-header">
        <div className="ic-header-content">
          <h1>Invoice Customization</h1>
          <p>Design professional invoices that match your practice's brand</p>
        </div>
        <div className="ic-header-actions">
          <button 
            className={`ic-btn ic-btn-secondary ${previewMode ? 'active' : ''}`}
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye size={16} />
            {previewMode ? 'Edit Mode' : 'Preview'}
          </button>
          <button className="ic-btn ic-btn-primary">
            <Save size={16} />
            Save Template
          </button>
        </div>
      </div>

      <div className="ic-container">
        {/* Sidebar - Customization Controls */}
        <div className="ic-sidebar">
          {/* Branding Section */}
          <div className="ic-panel">
            <h3 className="ic-panel-title">
              <Palette size={18} />
              Branding
            </h3>
            
            <div className="ic-control-group">
              <label>Logo</label>
              <div className="ic-logo-upload">
                {activeTemplate.logo ? (
                  <div className="ic-logo-preview">
                    <img src={activeTemplate.logo} alt="Practice logo" />
                    <button 
                      className="ic-remove-logo"
                      onClick={() => setActiveTemplate({...activeTemplate, logo: undefined})}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button 
                    className="ic-upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={20} />
                    Upload Logo
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            <div className="ic-control-group">
              <label>Primary Color</label>
              <div className="ic-color-picker">
                <input
                  type="color"
                  value={activeTemplate.colors.primary}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                />
                <span>{activeTemplate.colors.primary}</span>
              </div>
            </div>

            <div className="ic-control-group">
              <label>Secondary Color</label>
              <div className="ic-color-picker">
                <input
                  type="color"
                  value={activeTemplate.colors.secondary}
                  onChange={(e) => handleColorChange('secondary', e.target.value)}
                />
                <span>{activeTemplate.colors.secondary}</span>
              </div>
            </div>

            <div className="ic-control-group">
              <label>Font Family</label>
              <select 
                value={activeTemplate.branding.fontFamily}
                onChange={(e) => setActiveTemplate({
                  ...activeTemplate,
                  branding: { ...activeTemplate.branding, fontFamily: e.target.value }
                })}
              >
                <option value="Inter">Inter (Modern)</option>
                <option value="Arial">Arial (Classic)</option>
                <option value="Georgia">Georgia (Serif)</option>
                <option value="Helvetica">Helvetica (Clean)</option>
              </select>
            </div>

            <div className="ic-control-group">
              <label>Layout Style</label>
              <div className="ic-layout-options">
                {['modern', 'classic', 'minimal'].map(layout => (
                  <button
                    key={layout}
                    className={`ic-layout-btn ${activeTemplate.branding.layout === layout ? 'active' : ''}`}
                    onClick={() => setActiveTemplate({
                      ...activeTemplate,
                      branding: { ...activeTemplate.branding, layout: layout as any }
                    })}
                  >
                    {layout}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Header Options */}
          <div className="ic-panel">
            <h3 className="ic-panel-title">
              <FileText size={18} />
              Header Options
            </h3>
            
            <div className="ic-toggle-list">
              <label className="ic-toggle">
                <input
                  type="checkbox"
                  checked={activeTemplate.header.showLogo}
                  onChange={(e) => setActiveTemplate({
                    ...activeTemplate,
                    header: { ...activeTemplate.header, showLogo: e.target.checked }
                  })}
                />
                <span>Show Logo</span>
              </label>
              <label className="ic-toggle">
                <input
                  type="checkbox"
                  checked={activeTemplate.header.showPracticeName}
                  onChange={(e) => setActiveTemplate({
                    ...activeTemplate,
                    header: { ...activeTemplate.header, showPracticeName: e.target.checked }
                  })}
                />
                <span>Show Practice Name</span>
              </label>
              <label className="ic-toggle">
                <input
                  type="checkbox"
                  checked={activeTemplate.header.showAddress}
                  onChange={(e) => setActiveTemplate({
                    ...activeTemplate,
                    header: { ...activeTemplate.header, showAddress: e.target.checked }
                  })}
                />
                <span>Show Address</span>
              </label>
              <label className="ic-toggle">
                <input
                  type="checkbox"
                  checked={activeTemplate.header.showContact}
                  onChange={(e) => setActiveTemplate({
                    ...activeTemplate,
                    header: { ...activeTemplate.header, showContact: e.target.checked }
                  })}
                />
                <span>Show Contact Info</span>
              </label>
            </div>

            <div className="ic-control-group">
              <label>Custom Header Text</label>
              <textarea
                placeholder="Add custom text to header..."
                value={activeTemplate.header.customText || ''}
                onChange={(e) => setActiveTemplate({
                  ...activeTemplate,
                  header: { ...activeTemplate.header, customText: e.target.value }
                })}
                rows={2}
              />
            </div>
          </div>

          {/* Sections */}
          <div className="ic-panel">
            <h3 className="ic-panel-title">
              <Settings size={18} />
              Invoice Sections
            </h3>
            
            <div className="ic-sections-list">
              {activeTemplate.sections.map((section, index) => (
                <div key={section.id} className="ic-section-item">
                  <div className="ic-section-header">
                    <Move size={16} className="ic-drag-handle" />
                    <label className="ic-toggle">
                      <input
                        type="checkbox"
                        checked={section.visible}
                        onChange={() => handleSectionToggle(section.id)}
                      />
                      <span>{section.title}</span>
                    </label>
                    {section.type === 'custom' && (
                      <button 
                        className="ic-edit-btn"
                        onClick={() => setEditingSection(section.id)}
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <button className="ic-add-section-btn" onClick={addCustomSection}>
              <Plus size={16} />
              Add Custom Section
            </button>
          </div>

          {/* Footer Options */}
          <div className="ic-panel">
            <h3 className="ic-panel-title">
              <Type size={18} />
              Footer Options
            </h3>
            
            <div className="ic-toggle-list">
              <label className="ic-toggle">
                <input
                  type="checkbox"
                  checked={activeTemplate.footer.showPaymentInstructions}
                  onChange={(e) => setActiveTemplate({
                    ...activeTemplate,
                    footer: { ...activeTemplate.footer, showPaymentInstructions: e.target.checked }
                  })}
                />
                <span>Payment Instructions</span>
              </label>
              <label className="ic-toggle">
                <input
                  type="checkbox"
                  checked={activeTemplate.footer.showTerms}
                  onChange={(e) => setActiveTemplate({
                    ...activeTemplate,
                    footer: { ...activeTemplate.footer, showTerms: e.target.checked }
                  })}
                />
                <span>Terms & Conditions</span>
              </label>
            </div>

            <div className="ic-control-group">
              <label>Custom Footer Message</label>
              <textarea
                placeholder="Thank you for choosing our practice..."
                value={activeTemplate.footer.customMessage || ''}
                onChange={(e) => setActiveTemplate({
                  ...activeTemplate,
                  footer: { ...activeTemplate.footer, customMessage: e.target.value }
                })}
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Preview Area */}
        <div className="ic-preview-area">
          <div className="ic-preview-header">
            <h2>Invoice Preview</h2>
            <div className="ic-preview-actions">
              <button className="ic-btn ic-btn-text">
                <Download size={16} />
                Export PDF
              </button>
            </div>
          </div>

          <div className="ic-invoice-preview" style={{ fontFamily: activeTemplate.branding.fontFamily }}>
            {/* Invoice Header */}
            <div className="ic-invoice-header" style={{ borderBottomColor: activeTemplate.colors.primary }}>
              {activeTemplate.header.showLogo && activeTemplate.logo && (
                <img src={activeTemplate.logo} alt="Logo" className="ic-invoice-logo" />
              )}
              <div className="ic-invoice-header-content">
                {activeTemplate.header.showPracticeName && (
                  <h1 style={{ color: activeTemplate.colors.secondary }}>Your Practice Name</h1>
                )}
                {activeTemplate.header.showAddress && (
                  <p>123 Medical Plaza, Suite 100<br />Healthcare City, HC 12345</p>
                )}
                {activeTemplate.header.showContact && (
                  <p>Phone: (555) 123-4567 | Fax: (555) 123-4568<br />Email: billing@yourpractice.com</p>
                )}
                {activeTemplate.header.customText && (
                  <p className="ic-custom-text">{activeTemplate.header.customText}</p>
                )}
              </div>
            </div>

            {/* Invoice Body */}
            <div className="ic-invoice-body">
              <div className="ic-invoice-meta">
                <div>
                  <h3 style={{ color: activeTemplate.colors.primary }}>Invoice #INV-2024-001</h3>
                  <p>Date: November 30, 2024</p>
                  <p>Due Date: December 30, 2024</p>
                </div>
              </div>

              {/* Dynamic Sections */}
              {activeTemplate.sections
                .filter(section => section.visible)
                .sort((a, b) => a.order - b.order)
                .map(section => (
                  <div key={section.id} className="ic-invoice-section">
                    <h3 style={{ color: activeTemplate.colors.primary }}>{section.title}</h3>
                    {section.type === 'patient' && (
                      <div className="ic-section-content">
                        <p><strong>Patient:</strong> John Doe</p>
                        <p><strong>DOB:</strong> March 15, 1985</p>
                        <p><strong>Account #:</strong> PT-0001</p>
                      </div>
                    )}
                    {section.type === 'services' && (
                      <table className="ic-services-table">
                        <thead>
                          <tr style={{ backgroundColor: activeTemplate.colors.primary + '10' }}>
                            <th>Service</th>
                            <th>Date</th>
                            <th>CPT</th>
                            <th>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Office Visit - Established Patient</td>
                            <td>11/10/2024</td>
                            <td>99213</td>
                            <td>$250.00</td>
                          </tr>
                          <tr>
                            <td>Comprehensive Metabolic Panel</td>
                            <td>11/10/2024</td>
                            <td>80053</td>
                            <td>$150.00</td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                    {section.type === 'payment' && (
                      <div className="ic-payment-summary" style={{ backgroundColor: activeTemplate.colors.primary + '05' }}>
                        <div className="ic-summary-row">
                          <span>Subtotal:</span>
                          <span>$400.00</span>
                        </div>
                        <div className="ic-summary-row">
                          <span>Insurance Paid:</span>
                          <span style={{ color: activeTemplate.colors.accent }}>-$300.00</span>
                        </div>
                        <div className="ic-summary-row total" style={{ color: activeTemplate.colors.primary }}>
                          <span>Amount Due:</span>
                          <span>$100.00</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>

            {/* Invoice Footer */}
            <div className="ic-invoice-footer">
              {activeTemplate.footer.showPaymentInstructions && (
                <div className="ic-footer-section">
                  <h4>Payment Instructions</h4>
                  <p>Payment is due within 30 days. We accept cash, check, and all major credit cards.</p>
                </div>
              )}
              {activeTemplate.footer.customMessage && (
                <p className="ic-footer-message">{activeTemplate.footer.customMessage}</p>
              )}
              {activeTemplate.footer.showTerms && (
                <p className="ic-footer-terms">
                  Terms & Conditions: A finance charge of 1.5% per month will be applied to overdue accounts.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  CreditCard, 
  Shield, 
  BarChart3, 
  Users,
  FileText,
  CheckCircle,
  TrendingUp,
  Globe,
  RefreshCw,
  Zap,
  Award,
  ArrowRight
} from 'lucide-react';
import './BillingSystemShowcase.css';

export const BillingSystemShowcase: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState<string>('overview');

  const features = [
    {
      id: 'dashboard',
      title: 'Healthcare Billing Dashboard',
      icon: <BarChart3 size={24} />,
      description: 'Real-time financial metrics and insights',
      highlights: [
        'Live revenue tracking with MRR/ARR',
        'Insurance claim approval rates',
        'Collection rate monitoring',
        'Patient balance overview'
      ],
      metrics: {
        revenue: '$145,230',
        claims: '89.6%',
        collections: '95.1%'
      }
    },
    {
      id: 'portal',
      title: 'Patient Payment Portal',
      icon: <Users size={24} />,
      description: 'Self-service payment with exceptional UX',
      highlights: [
        'One-click payment options',
        'Flexible payment plans',
        'Secure card storage',
        'Mobile-optimized interface'
      ],
      metrics: {
        adoption: '78%',
        satisfaction: '4.8/5',
        avgPayTime: '2.3 days'
      }
    },
    {
      id: 'claims',
      title: 'Insurance Claims Manager',
      icon: <Shield size={24} />,
      description: 'Automated claim submission and tracking',
      highlights: [
        'Electronic claim submission',
        'Real-time status tracking',
        'Denial management workflow',
        'Appeal automation'
      ],
      metrics: {
        submitted: '432',
        approved: '387',
        recovery: '$234,560'
      }
    },
    {
      id: 'customization',
      title: 'Invoice Customization',
      icon: <FileText size={24} />,
      description: 'Professional branded invoices',
      highlights: [
        'Custom branding & logos',
        'Flexible layout templates',
        'Dynamic sections',
        'Multi-language support'
      ],
      metrics: {
        templates: '12+',
        languages: '5',
        customFields: 'Unlimited'
      }
    }
  ];

  const enterpriseFeatures = [
    {
      icon: <Globe size={20} />,
      title: 'Multi-Currency',
      description: '10+ currencies with real-time exchange rates'
    },
    {
      icon: <RefreshCw size={20} />,
      title: 'Smart Dunning',
      description: '45% payment recovery rate with automation'
    },
    {
      icon: <Zap size={20} />,
      title: 'Usage Billing',
      description: 'Flexible metered and tiered pricing models'
    },
    {
      icon: <Award size={20} />,
      title: 'Tax Compliance',
      description: 'Automated tax calculation for 50+ regions'
    }
  ];

  const testimonials = [
    {
      name: 'Dr. Sarah Johnson',
      role: 'Medical Director',
      quote: 'The billing system has transformed our practice. We\'ve reduced administrative time by 60% and improved cash flow significantly.',
      metric: '+42% Revenue'
    },
    {
      name: 'James Chen',
      role: 'Practice Administrator',
      quote: 'Patient satisfaction scores have increased dramatically since implementing the payment portal. It\'s intuitive and secure.',
      metric: '4.9★ Rating'
    }
  ];

  return (
    <div className="billing-showcase">
      {/* Hero Section */}
      <div className="bss-hero">
        <div className="bss-hero-content">
          <h1>Enterprise Healthcare Billing System</h1>
          <p>World-class billing infrastructure designed for modern healthcare practices</p>
          <div className="bss-hero-stats">
            <div className="bss-stat">
              <h3>99.9%</h3>
              <p>Uptime SLA</p>
            </div>
            <div className="bss-stat">
              <h3>$2.3M+</h3>
              <p>Processed Monthly</p>
            </div>
            <div className="bss-stat">
              <h3>45%</h3>
              <p>Recovery Rate</p>
            </div>
            <div className="bss-stat">
              <h3>HIPAA</h3>
              <p>Compliant</p>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Showcase */}
      <div className="bss-features">
        <h2>Premium Features Built for Healthcare</h2>
        <div className="bss-feature-grid">
          {features.map(feature => (
            <div 
              key={feature.id}
              className={`bss-feature-card ${activeFeature === feature.id ? 'active' : ''}`}
              onClick={() => setActiveFeature(feature.id)}
            >
              <div className="bss-feature-icon">
                {feature.icon}
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              
              <div className="bss-feature-highlights">
                {feature.highlights.map((highlight, idx) => (
                  <div key={idx} className="bss-highlight">
                    <CheckCircle size={14} />
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>

              <div className="bss-feature-metrics">
                {Object.entries(feature.metrics).map(([key, value]) => (
                  <div key={key} className="bss-metric">
                    <span className="bss-metric-value">{value}</span>
                    <span className="bss-metric-label">{key}</span>
                  </div>
                ))}
              </div>

              <button className="bss-feature-btn">
                Explore Feature <ArrowRight size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Enterprise Features */}
      <div className="bss-enterprise">
        <h2>Enterprise-Grade Infrastructure</h2>
        <div className="bss-enterprise-grid">
          {enterpriseFeatures.map((feature, idx) => (
            <div key={idx} className="bss-enterprise-item">
              <div className="bss-enterprise-icon">
                {feature.icon}
              </div>
              <div className="bss-enterprise-content">
                <h4>{feature.title}</h4>
                <p>{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Integration Showcase */}
      <div className="bss-integrations">
        <h2>Seamless Integrations</h2>
        <div className="bss-integration-logos">
          <div className="bss-logo-item">
            <CreditCard size={32} />
            <span>Stripe</span>
          </div>
          <div className="bss-logo-item">
            <Shield size={32} />
            <span>Insurance APIs</span>
          </div>
          <div className="bss-logo-item">
            <FileText size={32} />
            <span>EHR Systems</span>
          </div>
          <div className="bss-logo-item">
            <BarChart3 size={32} />
            <span>Analytics</span>
          </div>
        </div>
      </div>

      {/* Business Impact */}
      <div className="bss-impact">
        <h2>Measurable Business Impact</h2>
        <div className="bss-impact-grid">
          <div className="bss-impact-card">
            <TrendingUp size={32} className="bss-impact-icon up" />
            <h3>Revenue Growth</h3>
            <p className="bss-impact-metric">+30-50%</p>
            <p>Average increase in collections through automated recovery</p>
          </div>
          <div className="bss-impact-card">
            <Users size={32} className="bss-impact-icon" />
            <h3>Patient Satisfaction</h3>
            <p className="bss-impact-metric">+40%</p>
            <p>Improvement in payment experience ratings</p>
          </div>
          <div className="bss-impact-card">
            <Shield size={32} className="bss-impact-icon" />
            <h3>Compliance</h3>
            <p className="bss-impact-metric">100%</p>
            <p>HIPAA and PCI-DSS compliant infrastructure</p>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="bss-testimonials">
        <h2>Trusted by Healthcare Leaders</h2>
        <div className="bss-testimonial-grid">
          {testimonials.map((testimonial, idx) => (
            <div key={idx} className="bss-testimonial">
              <p className="bss-quote">"{testimonial.quote}"</p>
              <div className="bss-testimonial-footer">
                <div className="bss-testimonial-author">
                  <h4>{testimonial.name}</h4>
                  <p>{testimonial.role}</p>
                </div>
                <div className="bss-testimonial-metric">
                  {testimonial.metric}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bss-cta">
        <h2>Ready to Transform Your Billing?</h2>
        <p>Join leading healthcare practices using our enterprise billing system</p>
        <div className="bss-cta-buttons">
          <button className="bss-btn bss-btn-primary">
            Get Started Today
          </button>
          <button className="bss-btn bss-btn-secondary">
            Schedule Demo
          </button>
        </div>
      </div>
    </div>
  );
};

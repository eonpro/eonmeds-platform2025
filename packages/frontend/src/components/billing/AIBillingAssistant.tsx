import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle,
  Send,
  Bot,
  User,
  Sparkles,
  Mic,
  MicOff,
  Paperclip,
  X,
  Minimize2,
  Maximize2,
  HelpCircle,
  FileText,
  DollarSign,
  Shield,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Brain,
  Zap
} from 'lucide-react';
import './AIBillingAssistant.css';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: AssistantAction[];
  data?: any;
}

interface AssistantAction {
  label: string;
  action: string;
  params?: any;
}

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  query: string;
}

export const AIBillingAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m your AI billing assistant. I can help you with claims, payments, revenue analysis, and more. What can I help you with today?',
      timestamp: new Date(),
      actions: [
        { label: 'Check claim status', action: 'check_claims' },
        { label: 'View revenue metrics', action: 'show_revenue' },
        { label: 'Process payment', action: 'process_payment' },
        { label: 'Generate report', action: 'generate_report' }
      ]
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickActions: QuickAction[] = [
    {
      icon: <Shield size={18} />,
      label: 'Claim Status',
      query: 'What\'s the status of pending insurance claims?'
    },
    {
      icon: <DollarSign size={18} />,
      label: 'Revenue Today',
      query: 'How much revenue have we collected today?'
    },
    {
      icon: <AlertCircle size={18} />,
      label: 'Denied Claims',
      query: 'Show me all denied claims this week'
    },
    {
      icon: <TrendingUp size={18} />,
      label: 'Forecast',
      query: 'What\'s the revenue forecast for next month?'
    }
  ];

  const suggestedQueries = [
    'How many claims were submitted this week?',
    'What\'s our collection rate for Medicare patients?',
    'Show me overdue invoices over 90 days',
    'Which insurance company has the highest denial rate?',
    'Generate a financial summary for last month',
    'What\'s the average payment time for Aetna?',
    'Find unbilled services from last week',
    'Calculate revenue by provider this quarter'
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const processUserQuery = async (query: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: query,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    // Simulate AI processing
    setTimeout(() => {
      const response = generateAIResponse(query);
      setMessages(prev => [...prev, response]);
      setIsTyping(false);
    }, 1500);
  };

  const generateAIResponse = (query: string): Message => {
    const lowerQuery = query.toLowerCase();
    
    // Claims related queries
    if (lowerQuery.includes('claim') && (lowerQuery.includes('status') || lowerQuery.includes('pending'))) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: 'I found 47 pending insurance claims worth $125,430. Here\'s the breakdown:\n\n• 23 claims awaiting review (48.9%)\n• 15 claims pending additional information (31.9%)\n• 9 claims in processing (19.2%)\n\nThe average processing time is 5.2 days. Would you like me to show claims at risk of denial?',
        timestamp: new Date(),
        actions: [
          { label: 'View all claims', action: 'view_claims' },
          { label: 'Show at-risk claims', action: 'show_risk_claims' },
          { label: 'Export list', action: 'export_claims' }
        ],
        data: {
          totalClaims: 47,
          totalValue: 125430,
          breakdown: {
            review: 23,
            pending: 15,
            processing: 9
          }
        }
      };
    }

    // Revenue queries
    if (lowerQuery.includes('revenue') && (lowerQuery.includes('today') || lowerQuery.includes('collected'))) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: 'Today\'s revenue performance:\n\n💰 **Total Collected**: $42,856\n📈 **vs. Daily Average**: +18.5%\n\n**Breakdown by Source:**\n• Insurance Payments: $31,245 (72.9%)\n• Patient Payments: $8,920 (20.8%)\n• Other: $2,691 (6.3%)\n\nYou\'re having a strong day! This puts you on track to exceed this month\'s target by 12%.',
        timestamp: new Date(),
        actions: [
          { label: 'View detailed breakdown', action: 'revenue_details' },
          { label: 'Compare to yesterday', action: 'compare_yesterday' },
          { label: 'Monthly trends', action: 'monthly_trends' }
        ]
      };
    }

    // Denied claims
    if (lowerQuery.includes('denied') && lowerQuery.includes('claims')) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: 'This week, 8 claims were denied totaling $18,450. Here are the main reasons:\n\n🚫 **Denial Reasons:**\n1. Prior Authorization Required (3 claims - $8,200)\n2. Medical Necessity (2 claims - $5,100)\n3. Coding Errors (2 claims - $3,650)\n4. Timely Filing (1 claim - $1,500)\n\n💡 **AI Recommendation**: I can help you appeal 6 of these claims with a 75% success probability. Would you like me to prepare the appeals?',
        timestamp: new Date(),
        actions: [
          { label: 'Prepare appeals', action: 'prepare_appeals' },
          { label: 'View denial details', action: 'denial_details' },
          { label: 'Prevention tips', action: 'prevention_tips' }
        ]
      };
    }

    // Forecast queries
    if (lowerQuery.includes('forecast') || lowerQuery.includes('predict')) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: '📊 **Revenue Forecast for Next Month**\n\nBased on my analysis of historical patterns, scheduled appointments, and seasonal trends:\n\n**Predicted Revenue**: $1,285,000 - $1,342,000\n**Confidence Level**: 87%\n\n**Key Factors:**\n✅ 12% increase in scheduled procedures\n✅ Improved collection rate (94.5% → 96.2%)\n⚠️ Potential impact from 2 expiring insurance contracts\n\n**Recommendation**: Focus on renewing contracts with United and Cigna to maintain upper forecast range.',
        timestamp: new Date(),
        actions: [
          { label: 'View detailed forecast', action: 'detailed_forecast' },
          { label: 'Scenario planning', action: 'scenario_planning' },
          { label: 'Action items', action: 'forecast_actions' }
        ]
      };
    }

    // Collection rate
    if (lowerQuery.includes('collection rate')) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: '📈 **Collection Rate Analysis**\n\n**Current Collection Rate**: 94.8%\n**30-Day Trend**: ↑ 2.3%\n\n**By Payer Type:**\n• Medicare: 97.2% (excellent)\n• Commercial Insurance: 95.4% (good)\n• Medicaid: 91.8% (improving)\n• Self-Pay: 78.5% (needs attention)\n\n💡 **AI Insight**: Implementing payment plans for self-pay patients could improve their collection rate by 10-15%. Shall I show you the optimal payment plan structure?',
        timestamp: new Date(),
        actions: [
          { label: 'Payment plan options', action: 'payment_plans' },
          { label: 'Improvement strategies', action: 'improvement_strategies' },
          { label: 'Historical trends', action: 'collection_trends' }
        ]
      };
    }

    // Overdue invoices
    if (lowerQuery.includes('overdue') && lowerQuery.includes('invoice')) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: '⏰ **Overdue Invoices Analysis**\n\nI found 156 overdue invoices totaling $287,430:\n\n**Age Breakdown:**\n• 31-60 days: 89 invoices ($125,200)\n• 61-90 days: 42 invoices ($98,450)\n• Over 90 days: 25 invoices ($63,780)\n\n**Top Actions:**\n1. 🔔 Send automated reminders to 31-60 day accounts\n2. 📞 Personal calls for 61-90 day accounts\n3. 💳 Offer payment plans for 90+ day accounts\n\nWould you like me to initiate the dunning campaign?',
        timestamp: new Date(),
        actions: [
          { label: 'Start dunning campaign', action: 'start_dunning' },
          { label: 'Export invoice list', action: 'export_overdue' },
          { label: 'Contact patients', action: 'contact_patients' }
        ]
      };
    }

    // Default helpful response
    return {
      id: Date.now().toString(),
      type: 'assistant',
      content: 'I understand you\'re asking about "' + query + '". Let me help you with that. Here are some things I can assist with:\n\n• Check claim statuses and denials\n• Analyze revenue and collection rates\n• Forecast future revenue\n• Identify overdue accounts\n• Generate reports and insights\n• Process payments and refunds\n• Answer billing policy questions\n\nCould you please be more specific about what you\'d like to know?',
      timestamp: new Date(),
      actions: [
        { label: 'Show me examples', action: 'show_examples' },
        { label: 'Browse by category', action: 'browse_categories' }
      ]
    };
  };

  const handleSend = () => {
    if (inputValue.trim()) {
      processUserQuery(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleActionClick = (action: AssistantAction) => {
    // Simulate action handling
    const actionQuery = `Execute action: ${action.label}`;
    processUserQuery(actionQuery);
  };

  const handleQuickAction = (query: string) => {
    setInputValue(query);
    processUserQuery(query);
  };

  const toggleVoiceInput = () => {
    setIsListening(!isListening);
    if (!isListening) {
      // Start voice recognition (would implement actual speech recognition here)
      setTimeout(() => {
        setIsListening(false);
        setInputValue('Show me denied claims from last week');
      }, 2000);
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (!isOpen) {
    return (
      <button 
        className="aba-trigger"
        onClick={() => setIsOpen(true)}
        aria-label="Open AI Billing Assistant"
      >
        <div className="aba-trigger-icon">
          <Bot size={28} />
          <div className="aba-trigger-pulse"></div>
        </div>
        <span className="aba-trigger-label">AI Assistant</span>
      </button>
    );
  }

  return (
    <div className={`ai-billing-assistant ${isMinimized ? 'minimized' : ''}`}>
      {/* Header */}
      <div className="aba-header">
        <div className="aba-header-left">
          <div className="aba-bot-icon">
            <Bot size={20} />
          </div>
          <div className="aba-header-info">
            <h3>AI Billing Assistant</h3>
            <span className="aba-status">
              <span className="aba-status-dot"></span>
              Online • Ready to help
            </span>
          </div>
        </div>
        <div className="aba-header-actions">
          <button 
            className="aba-header-btn"
            onClick={() => setIsMinimized(!isMinimized)}
            aria-label={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button 
            className="aba-header-btn"
            onClick={() => setIsOpen(false)}
            aria-label="Close assistant"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Quick Actions */}
          <div className="aba-quick-actions">
            {quickActions.map((action, index) => (
              <button
                key={index}
                className="aba-quick-action"
                onClick={() => handleQuickAction(action.query)}
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="aba-messages">
            {messages.map((message) => (
              <div key={message.id} className={`aba-message ${message.type}`}>
                <div className="aba-message-avatar">
                  {message.type === 'assistant' ? (
                    <Bot size={20} />
                  ) : (
                    <User size={20} />
                  )}
                </div>
                <div className="aba-message-content">
                  <div className="aba-message-text">
                    {message.content.split('\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        {i < message.content.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </div>
                  {message.actions && message.actions.length > 0 && (
                    <div className="aba-message-actions">
                      {message.actions.map((action, index) => (
                        <button
                          key={index}
                          className="aba-action-btn"
                          onClick={() => handleActionClick(action)}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <span className="aba-message-time">
                    {formatTimestamp(message.timestamp)}
                  </span>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="aba-message assistant">
                <div className="aba-message-avatar">
                  <Bot size={20} />
                </div>
                <div className="aba-message-content">
                  <div className="aba-typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {messages.length === 1 && (
            <div className="aba-suggestions">
              <p className="aba-suggestions-title">Try asking:</p>
              <div className="aba-suggestions-list">
                {suggestedQueries.slice(0, 4).map((query, index) => (
                  <button
                    key={index}
                    className="aba-suggestion"
                    onClick={() => handleQuickAction(query)}
                  >
                    <Sparkles size={14} />
                    {query}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="aba-input-container">
            <div className="aba-input-wrapper">
              <button className="aba-input-btn" aria-label="Attach file">
                <Paperclip size={18} />
              </button>
              <input
                ref={inputRef}
                type="text"
                className="aba-input"
                placeholder="Ask me anything about billing..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <button 
                className={`aba-input-btn ${isListening ? 'listening' : ''}`}
                onClick={toggleVoiceInput}
                aria-label={isListening ? 'Stop listening' : 'Start voice input'}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <button 
                className="aba-send-btn"
                onClick={handleSend}
                disabled={!inputValue.trim()}
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </div>
            <div className="aba-input-footer">
              <span className="aba-powered-by">
                <Brain size={12} />
                Powered by Healthcare AI
              </span>
              <span className="aba-compliance">
                <Shield size={12} />
                HIPAA Compliant
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

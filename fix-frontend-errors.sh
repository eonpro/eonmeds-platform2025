#!/bin/bash

echo "🔧 Fixing Frontend Compilation Errors"
echo "======================================"

# Navigate to frontend directory
cd packages/frontend

echo "1. Removing problematic packages..."
npm uninstall date-fns lucide-react 2>/dev/null

echo "2. Installing specific versions to avoid conflicts..."
npm install date-fns@2.30.0 lucide-react@0.263.1

echo "3. Installing TypeScript types..."
npm install --save-dev @types/date-fns

echo "4. Fixing the Auth0Provider cacheLocation issue..."
cat > src/providers/Auth0Provider.tsx.tmp << 'EOF'
import React from 'react';
import { Auth0Provider } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';

export const Auth0ProviderWithNavigate = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const domain = process.env.REACT_APP_AUTH0_DOMAIN || '';
  const clientId = process.env.REACT_APP_AUTH0_CLIENT_ID || '';
  const redirectUri = process.env.REACT_APP_AUTH0_REDIRECT_URI || window.location.origin;
  const audience = process.env.REACT_APP_AUTH0_AUDIENCE;
  const scope = process.env.REACT_APP_AUTH0_SCOPE || 'openid profile email offline_access';
  const useRefreshTokens = process.env.REACT_APP_AUTH0_USE_REFRESH_TOKENS === 'true';

  const onRedirectCallback = (appState?: any) => {
    navigate(appState?.returnTo || window.location.pathname);
  };

  if (!domain || !clientId) {
    console.error('Auth0 configuration missing');
    return <>{children}</>;
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: redirectUri,
        audience: audience,
        scope: scope,
      }}
      onRedirectCallback={onRedirectCallback}
      cacheLocation="localstorage"
      useRefreshTokens={useRefreshTokens}
    >
      {children}
    </Auth0Provider>
  );
};
EOF

# Only replace if the temp file was created successfully
if [ -f src/providers/Auth0Provider.tsx.tmp ]; then
  mv src/providers/Auth0Provider.tsx.tmp src/providers/Auth0Provider.tsx
  echo "✅ Fixed Auth0Provider.tsx"
fi

echo "5. Fixing FraudDetectionDashboard X import..."
# Add X to the imports in FraudDetectionDashboard.tsx
sed -i '' 's/Lock,$/Lock,\n  X,/' src/components/billing/FraudDetectionDashboard.tsx 2>/dev/null || 
sed -i 's/Lock,$/Lock,\n  X,/' src/components/billing/FraudDetectionDashboard.tsx 2>/dev/null

echo "6. Creating billing components index file..."
cat > src/components/billing/index.ts << 'EOF'
// Export all billing components
export { BillingSystemShowcase } from './BillingSystemShowcase';
export { AnalyticsDashboard } from './AnalyticsDashboard';
export { AIBillingAssistant } from './AIBillingAssistant';
export { BatchOperations } from './BatchOperations';
export { FraudDetectionDashboard } from './FraudDetectionDashboard';
export { InsuranceClaimsManager } from './InsuranceClaimsManager';
export { InsuranceEligibilityVerification } from './InsuranceEligibilityVerification';
export { InvoiceCustomizer } from './InvoiceCustomizer';
export { RevenueCycleManagement } from './RevenueCycleManagement';
EOF

echo "7. Fixing StripePaymentSetup mode type..."
# Fix the mode type issue in StripePaymentSetup.tsx
sed -i '' 's/mode: invoiceId ? "payment" : "setup"/mode: (invoiceId ? "payment" : "setup") as "payment" | "setup"/' src/components/payments/StripePaymentSetup.tsx 2>/dev/null ||
sed -i 's/mode: invoiceId ? "payment" : "setup"/mode: (invoiceId ? "payment" : "setup") as "payment" | "setup"/' src/components/payments/StripePaymentSetup.tsx 2>/dev/null

echo "8. Restarting frontend server..."
# Kill existing frontend process
pkill -f "react-scripts start" 2>/dev/null

echo ""
echo "✅ All fixes applied!"
echo ""
echo "Now run these commands in separate terminals:"
echo "1. Backend:  cd packages/backend && npm run dev"
echo "2. Frontend: cd packages/frontend && npm start"
echo ""
echo "Note: You'll need to add your actual Stripe keys to the .env files"

/**
 * Auth0 Action to Add Roles to Tokens
 * 
 * To use this:
 * 1. Go to Auth0 Dashboard > Actions > Flows > Login
 * 2. Create a new Action called "Add Roles to Tokens"
 * 3. Copy this code into the action
 * 4. Deploy the action
 * 5. Add the action to the Login flow
 */

exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://eonmeds.com';
  
  if (event.authorization) {
    // Get the user's roles
    const assignedRoles = event.authorization.roles || [];
    
    // Add roles to ID token
    api.idToken.setCustomClaim(`${namespace}/roles`, assignedRoles);
    
    // Add roles to Access token  
    api.accessToken.setCustomClaim(`${namespace}/roles`, assignedRoles);
    
    // Also add user metadata if needed
    const userMetadata = event.user.user_metadata || {};
    api.idToken.setCustomClaim(`${namespace}/user_metadata`, userMetadata);
    
    // Log for debugging
    console.log('User email:', event.user.email);
    console.log('Assigned roles:', assignedRoles);
  }
}; 
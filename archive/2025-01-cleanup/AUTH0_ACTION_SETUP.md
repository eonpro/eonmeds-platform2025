# Auth0 Action Setup for Role Management

## Overview
This guide will help you set up an Auth0 Action to include user roles in the ID token, making them accessible to your React application.

## Steps to Create the Action

### 1. Navigate to Auth0 Actions
1. Go to your Auth0 Dashboard
2. In the left sidebar, click on **Actions**
3. Click on **Library**
4. Click **Create Action** → **Build Custom**

### 2. Configure the Action
- **Name**: Add User Roles to Token
- **Trigger**: Login / Post Login
- **Runtime**: Node 16 (recommended)

### 3. Add the Action Code

Copy and paste this code into the Action editor:

```javascript
/**
 * Handler that will be called during the execution of a PostLogin flow.
 * 
 * @param {Event} event - Details about the user and the context in which they are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
 */
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://eonmeds.com';
  
  // Get the user's roles from the authorization context
  const assignedRoles = (event.authorization || {}).roles || [];
  
  // Add roles to ID token
  api.idToken.setCustomClaim(`${namespace}/roles`, assignedRoles);
  
  // Also add to access token for API access
  api.accessToken.setCustomClaim(`${namespace}/roles`, assignedRoles);
  
  // Add user metadata if needed
  if (event.user.user_metadata) {
    api.idToken.setCustomClaim(`${namespace}/user_metadata`, event.user.user_metadata);
  }
  
  // Add app metadata if needed
  if (event.user.app_metadata) {
    api.idToken.setCustomClaim(`${namespace}/app_metadata`, event.user.app_metadata);
  }
  
  // Log for debugging (remove in production)
  console.log('User:', event.user.email);
  console.log('Assigned Roles:', assignedRoles);
};
```

### 4. Deploy the Action
1. Click **Deploy** in the Action editor
2. Go back to **Actions → Flows**
3. Select **Login**
4. Drag your "Add User Roles to Token" action into the flow
5. Click **Apply**

### 5. Test the Implementation

#### Option A: Test in Auth0
1. Go to **Actions → Flows → Login**
2. Click on **Test** (play button)
3. You should see the roles being added to the token

#### Option B: Test in Your App
1. Log out of your application completely
2. Clear browser cache/cookies for your app domain
3. Log in again
4. Open browser Developer Console (F12)
5. Check for these console logs:
   - `Sidebar - User roles: [...]`
   - `Sidebar - Is Admin?: true/false`

### 6. Verify Token Contents

You can decode your ID token to verify roles are included:

1. In your app, add this temporary debug code:

```javascript
const { getIdTokenClaims } = useAuth0();

useEffect(() => {
  const checkToken = async () => {
    const claims = await getIdTokenClaims();
    console.log('Full ID Token Claims:', claims);
    console.log('Roles from token:', claims?.['https://eonmeds.com/roles']);
  };
  checkToken();
}, []);
```

2. Check the console for the token contents

## Troubleshooting

### If roles are not showing up:

1. **Check Role Assignment**:
   - Go to Auth0 Dashboard → User Management → Users
   - Click on your user
   - Go to Roles tab
   - Ensure "admin" or "superadmin" is assigned

2. **Force Token Refresh**:
   - Log out completely
   - Clear all browser data for your domain
   - Close all browser tabs with your app
   - Log in fresh

3. **Check Action is Active**:
   - Go to Actions → Flows → Login
   - Ensure your Action is in the flow and enabled

### Common Issues:

- **Roles not in token**: Make sure the Action is deployed and added to the Login flow
- **Old token cached**: Force a fresh login by clearing browser data
- **Wrong namespace**: Ensure the namespace in the Action matches what your React app expects (`https://eonmeds.com`)

## Next Steps

Once roles are properly included in the token:
1. The Financial Dashboard menu item should appear for admin/superadmin users
2. The route protection should work correctly
3. You can remove the debug console.log statements

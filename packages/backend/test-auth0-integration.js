/**
 * Test Auth0 Integration
 *
 * Run this script to test Auth0 integration and check user roles
 * Usage: node test-auth0-integration.js
 */

require("dotenv").config();
const axios = require("axios");

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;

async function getManagementToken() {
  try {
    const response = await axios.post(`https://${AUTH0_DOMAIN}/oauth/token`, {
      client_id: AUTH0_CLIENT_ID,
      client_secret: AUTH0_CLIENT_SECRET,
      audience: `https://${AUTH0_DOMAIN}/api/v2/`,
      grant_type: "client_credentials",
    });

    return response.data.access_token;
  } catch (error) {
    console.error(
      "Error getting management token:",
      error.response?.data || error.message,
    );
    throw error;
  }
}

async function getUserByEmail(email, token) {
  try {
    const response = await axios.get(
      `https://${AUTH0_DOMAIN}/api/v2/users-by-email`,
      {
        params: { email },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return response.data[0];
  } catch (error) {
    console.error("Error getting user:", error.response?.data || error.message);
    throw error;
  }
}

async function getUserRoles(userId, token) {
  try {
    const response = await axios.get(
      `https://${AUTH0_DOMAIN}/api/v2/users/${userId}/roles`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error(
      "Error getting user roles:",
      error.response?.data || error.message,
    );
    throw error;
  }
}

async function main() {
  console.log("Testing Auth0 Integration...\n");
  console.log("Auth0 Domain:", AUTH0_DOMAIN);
  console.log("Auth0 Audience:", AUTH0_AUDIENCE);

  try {
    // Get management token
    console.log("\n1. Getting management token...");
    const token = await getManagementToken();
    console.log("✓ Management token obtained");

    // Test with your email
    const testEmail = process.argv[2] || "your-email@example.com";
    console.log(`\n2. Looking up user: ${testEmail}`);

    const user = await getUserByEmail(testEmail, token);
    if (user) {
      console.log("✓ User found:");
      console.log("  - ID:", user.user_id);
      console.log("  - Name:", user.name);
      console.log("  - Email:", user.email);
      console.log("  - Created:", user.created_at);

      // Get user roles
      console.log("\n3. Getting user roles...");
      const roles = await getUserRoles(user.user_id, token);

      if (roles.length > 0) {
        console.log("✓ User roles:");
        roles.forEach((role) => {
          console.log(`  - ${role.name} (${role.description})`);
        });
      } else {
        console.log("⚠ No roles assigned to this user");
        console.log("\nTo assign roles:");
        console.log("1. Go to Auth0 Dashboard > User Management > Users");
        console.log("2. Click on your user");
        console.log("3. Go to the Roles tab");
        console.log('4. Click "Assign Roles" and select "superadmin"');
      }

      // Check app metadata
      console.log("\n4. User metadata:");
      console.log(
        "  - App metadata:",
        JSON.stringify(user.app_metadata, null, 2),
      );
      console.log(
        "  - User metadata:",
        JSON.stringify(user.user_metadata, null, 2),
      );
    } else {
      console.log("✗ User not found");
    }
  } catch (error) {
    console.error("\n✗ Test failed:", error.message);
    console.log("\nMake sure you have set these environment variables:");
    console.log("- AUTH0_DOMAIN");
    console.log("- AUTH0_CLIENT_ID");
    console.log("- AUTH0_CLIENT_SECRET");
    console.log("- AUTH0_AUDIENCE");
  }
}

// Run with: node test-auth0-integration.js your-email@example.com
main();

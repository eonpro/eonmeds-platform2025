import React from "react";
import { useAuth0 } from "@auth0/auth0-react";

export const TestAuth: React.FC = () => {
  const {
    isAuthenticated,
    isLoading,
    error,
    user,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
  } = useAuth0();

  const testAuth = async () => {
    try {
      const token = await getAccessTokenSilently();
      console.log("Access Token:", token);
      alert("Token retrieved! Check console.");
    } catch (err) {
      console.error("Error getting token:", err);
      alert("Error getting token. Check console.");
    }
  };

  const handleLogin = () => {
    console.log("Attempting login...");
    loginWithRedirect({
      appState: { returnTo: "/test-auth" },
    });
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Auth0 Test Page</h1>

      <div
        style={{
          marginBottom: "2rem",
          padding: "1rem",
          backgroundColor: "#f0f0f0",
          borderRadius: "8px",
        }}
      >
        <h2>Current Status</h2>
        <p>
          <strong>Loading:</strong> {isLoading ? "Yes" : "No"}
        </p>
        <p>
          <strong>Authenticated:</strong> {isAuthenticated ? "Yes" : "No"}
        </p>
        <p>
          <strong>Error:</strong> {error ? error.message : "None"}
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#ffcccc",
            borderRadius: "8px",
            marginBottom: "1rem",
          }}
        >
          <h3>Error Details:</h3>
          <pre>{JSON.stringify(error, null, 2)}</pre>
        </div>
      )}

      {!isAuthenticated && !isLoading && (
        <div style={{ marginBottom: "2rem" }}>
          <button
            onClick={handleLogin}
            style={{
              padding: "1rem 2rem",
              fontSize: "1.2rem",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Test Login
          </button>
        </div>
      )}

      {isAuthenticated && (
        <>
          <div
            style={{
              marginBottom: "2rem",
              padding: "1rem",
              backgroundColor: "#ccffcc",
              borderRadius: "8px",
            }}
          >
            <h2>User Info</h2>
            <pre>{JSON.stringify(user, null, 2)}</pre>
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              onClick={testAuth}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#2196F3",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Test Get Token
            </button>

            <button
              onClick={() =>
                logout({ logoutParams: { returnTo: window.location.origin } })
              }
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#f44336",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>
        </>
      )}

      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          backgroundColor: "#e0e0e0",
          borderRadius: "8px",
        }}
      >
        <h3>Configuration</h3>
        <p>
          <strong>Domain:</strong> {process.env.REACT_APP_AUTH0_DOMAIN}
        </p>
        <p>
          <strong>Client ID:</strong> {process.env.REACT_APP_AUTH0_CLIENT_ID}
        </p>
        <p>
          <strong>Audience:</strong> {process.env.REACT_APP_AUTH0_AUDIENCE}
        </p>
        <p>
          <strong>Current URL:</strong> {window.location.origin}
        </p>
      </div>
    </div>
  );
};

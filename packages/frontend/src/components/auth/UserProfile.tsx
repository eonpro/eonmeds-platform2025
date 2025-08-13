import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import authService from "../../services/auth.service";

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  roleCode: string;
  language: string;
}

export const UserProfile: React.FC = () => {
  const { user, isAuthenticated, isLoading, getIdTokenClaims } = useAuth0();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const syncAndLoadUser = async () => {
      if (!isAuthenticated || isLoading) return;

      try {
        setLoading(true);

        // First sync the user with backend
        await authService.syncUser();

        // Then get the current user data
        const currentUser = await authService.getCurrentUser();
        setUserData(currentUser);

        // Get language from token
        const claims = await getIdTokenClaims();
        const language = claims?.["https://eonmeds.com/language"] || "en";

        if (currentUser) {
          setUserData({ ...currentUser, language });
        }
      } catch (err: any) {
        setError(err.message || "Failed to load user data");
      } finally {
        setLoading(false);
      }
    };

    syncAndLoadUser();
  }, [isAuthenticated, isLoading, getIdTokenClaims]);

  if (isLoading || loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <div>Please log in to view your profile.</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="user-profile">
      <h2>User Profile</h2>

      <div className="profile-section">
        <h3>Auth0 Information</h3>
        <img src={user?.picture} alt={user?.name} width="100" />
        <p>
          <strong>Auth0 ID:</strong> {user?.sub}
        </p>
        <p>
          <strong>Email:</strong> {user?.email}
        </p>
        <p>
          <strong>Email Verified:</strong> {user?.email_verified ? "Yes" : "No"}
        </p>
      </div>

      {userData && (
        <div className="profile-section">
          <h3>EONMeds Profile</h3>
          <p>
            <strong>Name:</strong> {userData.firstName} {userData.lastName}
          </p>
          <p>
            <strong>Phone:</strong> {userData.phone || "Not provided"}
          </p>
          <p>
            <strong>Role:</strong> {userData.role} ({userData.roleCode})
          </p>
          <p>
            <strong>Language:</strong>{" "}
            {userData.language === "es" ? "Español" : "English"}
          </p>
          <p>
            <strong>Database ID:</strong> {userData.id}
          </p>
        </div>
      )}

      <div className="profile-section">
        <h3>Raw Token Claims</h3>
        <pre>{JSON.stringify(user, null, 2)}</pre>
      </div>
    </div>
  );
};

import React from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles = [],
  requiredPermissions = [],
}) => {
  const { isAuthenticated, isLoading, user, getIdTokenClaims } = useAuth0();
  const [hasAccess, setHasAccess] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const checkAccess = async () => {
      if (!isAuthenticated || isLoading) return;

      try {
        const claims = await getIdTokenClaims();

        // Check roles
        if (requiredRoles.length > 0) {
          const userRoles = claims?.["https://eonmeds.com/roles"] || [];
          const hasRequiredRole = requiredRoles.some((role) =>
            userRoles.includes(role),
          );
          if (!hasRequiredRole) {
            setHasAccess(false);
            return;
          }
        }

        // Check permissions
        if (requiredPermissions.length > 0) {
          const userPermissions = claims?.permissions || [];
          const hasRequiredPermissions = requiredPermissions.every(
            (permission) => userPermissions.includes(permission),
          );
          if (!hasRequiredPermissions) {
            setHasAccess(false);
            return;
          }
        }

        setHasAccess(true);
      } catch (error) {
        console.error("Error checking access:", error);
        setHasAccess(false);
      }
    };

    checkAccess();
  }, [
    isAuthenticated,
    isLoading,
    user,
    requiredRoles,
    requiredPermissions,
    getIdTokenClaims,
  ]);

  if (isLoading || hasAccess === null) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (hasAccess === false) {
    return (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>You don't have permission to access this page.</p>
        {requiredRoles.length > 0 && (
          <p>Required roles: {requiredRoles.join(", ")}</p>
        )}
        {requiredPermissions.length > 0 && (
          <p>Required permissions: {requiredPermissions.join(", ")}</p>
        )}
      </div>
    );
  }

  return <>{children}</>;
};

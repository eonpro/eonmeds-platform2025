import React from "react";
import { Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { LoginButton } from "../auth/LoginButton";
import { LogoutButton } from "../auth/LogoutButton";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { Logo } from "../common/Logo";
import { useTranslation } from "react-i18next";

export const Navbar: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth0();
  const { t } = useTranslation(["common"]);

  return (
    <nav className="navbar bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <Logo height={40} className="mr-3" />
              <span className="text-xl font-semibold text-gray-900 hidden sm:block">
                EONMeds
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-4">
            {isAuthenticated && (
              <>
                <Link
                  to="/dashboard"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  {t("navigation.dashboard")}
                </Link>
                <Link
                  to="/profile"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  {t("navigation.profile")}
                </Link>
              </>
            )}

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Auth Buttons */}
            {!isLoading && (
              <>
                {isAuthenticated ? (
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">
                      {user?.name || user?.email}
                    </span>
                    <LogoutButton />
                  </div>
                ) : (
                  <LoginButton />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

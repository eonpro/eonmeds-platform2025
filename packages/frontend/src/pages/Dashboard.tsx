import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useTranslation } from 'react-i18next';
import { Clients } from './Clients';

interface DashboardData {
  userRole: string;
  totalPatients?: number;
  pendingAppointments?: number;
  todayAppointments?: number;
}

export const Dashboard: React.FC = () => {
  const { user, getIdTokenClaims } = useAuth0();
  const { t } = useTranslation(['dashboard', 'common']);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const claims = await getIdTokenClaims();

        // Check for roles in different possible locations
        const roles =
          claims?.['https://eonmeds.com/roles'] ||
          claims?.roles ||
          user?.['https://eonmeds.com/roles'] ||
          user?.roles ||
          [];

        // For now, let's assume superadmin if no roles found (for testing)
        const userRole = roles.length > 0 ? roles[0] : 'superadmin';

        // In a real app, this would fetch from the API
        const mockData: DashboardData = {
          userRole,
          totalPatients: userRole !== 'patient' ? 150 : undefined,
          pendingAppointments: userRole !== 'patient' ? 12 : 2,
          todayAppointments: userRole !== 'patient' ? 8 : 1,
        };

        setDashboardData(mockData);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [getIdTokenClaims, user]);

  if (loading) {
    return <div>{t('common:actions.loading')}</div>;
  }

  // For admin/superadmin, show the Clients component directly
  if (
    dashboardData &&
    (dashboardData.userRole === 'admin' || dashboardData.userRole === 'superadmin')
  ) {
    return <Clients />;
  }

  return (
    <div className="dashboard-page">
      <h1>{t('title')}</h1>
      <p>{t('welcome', { name: user?.name || user?.email })}</p>

      {dashboardData && (
        <>
          <div className="role-badge">
            {t('role', { role: t(`common:roles.${dashboardData.userRole}`) })}
          </div>

          {/* Provider Dashboard */}
          {dashboardData.userRole === 'provider' && (
            <div className="dashboard-grid">
              <div className="dashboard-card">
                <h3>Total Patients</h3>
                <p className="metric">{dashboardData.totalPatients}</p>
              </div>
              <div className="dashboard-card">
                <h3>Pending Appointments</h3>
                <p className="metric">{dashboardData.pendingAppointments}</p>
              </div>
              <div className="dashboard-card">
                <h3>Today's Appointments</h3>
                <p className="metric">{dashboardData.todayAppointments}</p>
              </div>
              <div className="dashboard-card">
                <h3>Quick Actions</h3>
                <button className="btn btn-primary">New Patient</button>
                <button className="btn btn-secondary">View Schedule</button>
              </div>
            </div>
          )}

          {/* Sales Rep Dashboard */}
          {dashboardData.userRole === 'sales_rep' && (
            <div className="dashboard-grid">
              <div className="dashboard-card">
                <h3>New Leads</h3>
                <p className="metric">23</p>
              </div>
              <div className="dashboard-card">
                <h3>Active Campaigns</h3>
                <p className="metric">5</p>
              </div>
              <div className="dashboard-card">
                <h3>Conversions This Month</h3>
                <p className="metric">18</p>
              </div>
            </div>
          )}

          {/* Patient Dashboard */}
          {dashboardData.userRole === 'patient' && (
            <div className="dashboard-grid">
              <div className="dashboard-card">
                <h3>{t('widgets.appointments.title')}</h3>
                <p className="metric">
                  {t('widgets.appointments.count', { count: dashboardData.pendingAppointments })}
                </p>
              </div>
              <div className="dashboard-card">
                <h3>{t('widgets.prescriptions.title')}</h3>
                <p className="metric">{t('widgets.prescriptions.active', { count: 3 })}</p>
              </div>
              <div className="dashboard-card">
                <h3>{t('widgets.messages.title')}</h3>
                <p className="metric">{t('widgets.messages.unread', { count: 2 })}</p>
              </div>
              <div className="dashboard-card">
                <h3>{t('quickActions.title')}</h3>
                <button className="btn btn-primary">{t('quickActions.bookAppointment')}</button>
                <button className="btn btn-secondary">{t('quickActions.viewRecords')}</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

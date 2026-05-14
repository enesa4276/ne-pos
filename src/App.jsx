import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { LanguageProvider } from '@/lib/LanguageContext';
import { TenantProvider } from '@/lib/TenantContext';
import { OrderNotificationsProvider } from '@/lib/OrderNotifications';
import OrderNotificationOverlay from '@/components/notifications/OrderNotificationOverlay';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from '@/components/Layout';
import Tables from '@/pages/Tables';
import POS from '@/pages/POS';
import Tablet from '@/pages/Tablet';
import Orders from '@/pages/Orders';
import OrderHistory from '@/pages/OrderHistory';
import Admin from '@/pages/Admin';
import Analytics from '@/pages/Analytics';
import Account from '@/pages/Account';
import AIPhoneDashboard from '@/pages/AIPhoneDashboard';
import SuperAdminDashboard from '@/pages/super-admin/SuperAdminDashboard';
import TenantManagement from '@/pages/admin/TenantManagement';
import TenantDetail from '@/pages/admin/TenantDetail';
import QRCodeManager from '@/pages/admin/QRCodeManager';
import LiveCalls from '@/pages/LiveCalls';
import QRMenu from '@/pages/qr/QRMenu';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();

  // QR menu is PUBLIC — bypass auth entirely
  if (location.pathname.startsWith('/qr/')) {
    return (
      <Routes>
        <Route path="/qr/:tenantId/:tableId" element={<QRMenu />} />
      </Routes>
    );
  }

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      {/* Tablet mode — no main layout, fullscreen */}
      <Route path="/tablet" element={<Tablet />} />

      {/* Super Admin — its own minimal area, separated from tenant UI */}
      <Route element={<Layout />}>
        <Route path="/super-admin" element={<SuperAdminDashboard />} />
        <Route path="/super-admin/tenants" element={<TenantManagement />} />
        <Route path="/super-admin/tenants/:tenantId" element={<TenantDetail />} />
      </Route>

      {/* Tenant app */}
      <Route element={<Layout />}>
        <Route path="/" element={<Tables />} />
        <Route path="/pos" element={<POS />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/history" element={<OrderHistory />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/qr-codes" element={<QRCodeManager />} />
        <Route path="/ai-phone" element={<AIPhoneDashboard />} />
        <Route path="/live-calls" element={<LiveCalls />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/account" element={<Account />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClientInstance}>
          <TenantProvider>
            <OrderNotificationsProvider>
              <Router>
                <AuthenticatedApp />
                <OrderNotificationOverlay />
              </Router>
              <Toaster />
            </OrderNotificationsProvider>
          </TenantProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </AuthProvider>
  )
}

export default App
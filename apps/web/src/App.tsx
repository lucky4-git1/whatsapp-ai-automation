import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// 11 Core Commercial SaaS Modules
import DashboardPage from './pages/dashboard/DashboardPage';
import WhatsAppConnectionsPage from './pages/connections/WhatsAppConnectionsPage';
import ContactsPage from './pages/contacts/ContactsPage';
import ContactDetailPage from './pages/contacts/ContactDetailPage';
import AudiencesPage from './pages/audiences/AudiencesPage';
import CampaignsPage from './pages/campaigns/CampaignsPage';
import WorkflowsPage from './pages/workflows/WorkflowsPage';
import InboxPage from './pages/inbox/InboxPage';
import AIStudioPage from './pages/ai-studio/AIStudioPage';
import TemplatesPage from './pages/templates/TemplatesPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';

// Settings Sub-pages
import WorkspaceSettingsPage from './pages/settings/WorkspaceSettingsPage';
import TeamPage from './pages/settings/TeamPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Dashboard Routes - 11 Core SaaS Sections */}
        <Route element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
          {/* 1. Overview */}
          <Route path="/" element={<DashboardPage />} />

          {/* 2. WhatsApp Connections */}
          <Route path="/connections" element={<WhatsAppConnectionsPage />} />

          {/* 3. Contacts CRM */}
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/contacts/:id" element={<ContactDetailPage />} />

          {/* 4. Audiences */}
          <Route path="/audiences" element={<AudiencesPage />} />

          {/* 5. Campaigns */}
          <Route path="/campaigns" element={<CampaignsPage />} />

          {/* 6. Visual Automation */}
          <Route path="/automation" element={<WorkflowsPage />} />
          <Route path="/workflows" element={<WorkflowsPage />} />

          {/* 7. Shared Inbox */}
          <Route path="/inbox" element={<InboxPage />} />

          {/* 8. AI Studio */}
          <Route path="/ai-studio" element={<AIStudioPage />} />

          {/* 9. Templates */}
          <Route path="/templates" element={<TemplatesPage />} />

          {/* 10. Analytics */}
          <Route path="/analytics" element={<AnalyticsPage />} />

          {/* 11. Settings */}
          <Route path="/settings" element={<WorkspaceSettingsPage />} />
          <Route path="/settings/whatsapp" element={<WhatsAppConnectionsPage />} />
          <Route path="/settings/workspace" element={<WorkspaceSettingsPage />} />
          <Route path="/settings/team" element={<TeamPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default App;

import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useState } from 'react';

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItemClass = (path: string) =>
    `d-flex align-items-center px-3 py-2 text-decoration-none rounded-2 mb-1 ${
      isActive(path)
        ? 'bg-success text-white fw-semibold shadow-sm'
        : 'text-white-50 hover-bg-secondary'
    }`;

  return (
    <div className="d-flex min-vh-100 position-relative bg-light">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-md-none"
          style={{ zIndex: 1040 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`bg-dark text-white d-flex flex-column ${
          sidebarOpen
            ? 'position-fixed top-0 start-0 h-100 shadow-lg'
            : 'd-none d-md-flex'
        }`}
        style={{
          width: '260px',
          flexShrink: 0,
          zIndex: 1050,
          backgroundColor: '#0F172A',
          borderRight: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Brand */}
        <div className="p-3 border-bottom border-secondary border-opacity-25">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center me-2 shadow-sm"
                style={{ width: '36px', height: '36px', backgroundColor: '#25D366' }}
              >
                <i className="fab fa-whatsapp text-white fa-lg"></i>
              </div>
              <div>
                <div className="fw-bold lh-1 text-white" style={{ fontSize: '1rem' }}>
                  WhatsApp AI
                </div>
                <small className="text-white-50" style={{ fontSize: '0.75rem' }}>
                  Enterprise Automation
                </small>
              </div>
            </div>
            <button
              className="btn btn-link text-white-50 d-md-none p-0"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close Sidebar"
            >
              <i className="fas fa-times fa-lg"></i>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 flex-fill overflow-auto">
          {/* Section: Core */}
          <div className="text-white-50 fw-bold text-uppercase mb-2" style={{ fontSize: '0.68rem', letterSpacing: '0.05em' }}>
            Core Operations
          </div>

          <Link to="/" onClick={() => setSidebarOpen(false)} className={navItemClass('/')}>
            <i className="fas fa-th-large me-2 text-center" style={{ width: '20px' }}></i>
            Overview
          </Link>

          <Link to="/inbox" onClick={() => setSidebarOpen(false)} className={navItemClass('/inbox')}>
            <i className="fas fa-inbox me-2 text-center" style={{ width: '20px' }}></i>
            Shared Inbox
          </Link>

          <Link to="/contacts" onClick={() => setSidebarOpen(false)} className={navItemClass('/contacts')}>
            <i className="fas fa-address-book me-2 text-center" style={{ width: '20px' }}></i>
            Contacts CRM
          </Link>

          <Link to="/audiences" onClick={() => setSidebarOpen(false)} className={navItemClass('/audiences')}>
            <i className="fas fa-users me-2 text-center" style={{ width: '20px' }}></i>
            Audiences
          </Link>

          {/* Section: Marketing & Automation */}
          <div className="text-white-50 fw-bold text-uppercase mt-3 mb-2" style={{ fontSize: '0.68rem', letterSpacing: '0.05em' }}>
            Marketing & Scale
          </div>

          <Link to="/campaigns" onClick={() => setSidebarOpen(false)} className={navItemClass('/campaigns')}>
            <i className="fas fa-paper-plane me-2 text-center" style={{ width: '20px' }}></i>
            Campaigns
          </Link>

          <Link to="/automation" onClick={() => setSidebarOpen(false)} className={navItemClass('/automation')}>
            <i className="fas fa-project-diagram me-2 text-center" style={{ width: '20px' }}></i>
            Automation
          </Link>

          <Link to="/templates" onClick={() => setSidebarOpen(false)} className={navItemClass('/templates')}>
            <i className="far fa-file-alt me-2 text-center" style={{ width: '20px' }}></i>
            Templates
          </Link>

          {/* Section: Intelligence & Analytics */}
          <div className="text-white-50 fw-bold text-uppercase mt-3 mb-2" style={{ fontSize: '0.68rem', letterSpacing: '0.05em' }}>
            Intelligence & Data
          </div>

          <Link to="/ai-studio" onClick={() => setSidebarOpen(false)} className={navItemClass('/ai-studio')}>
            <i className="fas fa-brain me-2 text-center" style={{ width: '20px' }}></i>
            AI Studio
          </Link>

          <Link to="/analytics" onClick={() => setSidebarOpen(false)} className={navItemClass('/analytics')}>
            <i className="fas fa-chart-line me-2 text-center" style={{ width: '20px' }}></i>
            Analytics
          </Link>

          {/* Section: Connectivity & Settings */}
          <div className="text-white-50 fw-bold text-uppercase mt-3 mb-2" style={{ fontSize: '0.68rem', letterSpacing: '0.05em' }}>
            Connectivity & Setup
          </div>

          <Link to="/connections" onClick={() => setSidebarOpen(false)} className={navItemClass('/connections')}>
            <i className="fab fa-whatsapp me-2 text-center" style={{ width: '20px' }}></i>
            WhatsApp Connections
          </Link>

          <Link to="/settings/workspace" onClick={() => setSidebarOpen(false)} className={navItemClass('/settings')}>
            <i className="fas fa-cog me-2 text-center" style={{ width: '20px' }}></i>
            Settings
          </Link>
        </nav>

        {/* Footer Meta Status */}
        <div className="p-3 border-top border-secondary border-opacity-25 small text-white-50">
          <div className="d-flex align-items-center justify-content-between">
            <span className="d-flex align-items-center">
              <span className="badge rounded-pill bg-success p-1 me-2"></span>
              Meta Cloud API
            </span>
            <span className="text-muted" style={{ fontSize: '0.7rem' }}>v21.0</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-fill d-flex flex-column min-w-0">
        {/* Header */}
        <header className="bg-white border-bottom px-3 px-md-4 py-3 sticky-top shadow-sm">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <button
                className="btn btn-outline-secondary btn-sm d-md-none me-2"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Toggle Navigation"
              >
                <i className="fas fa-bars"></i>
              </button>
              <div>
                <h5 className="mb-0 fw-bold text-dark">
                  {user?.memberships?.[0]?.workspaceName || 'WhatsApp Automation Workspace'}
                </h5>
                <small className="text-muted">Enterprise Cloud Production</small>
              </div>
            </div>

            <div className="position-relative">
              <button
                className="btn btn-light border text-dark text-decoration-none py-1 px-3 rounded-pill"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="d-flex align-items-center">
                  <div
                    className="avatar avatar-sm bg-success text-white me-2 rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: '28px', height: '28px', fontSize: '0.8rem' }}
                  >
                    {user?.firstName?.[0] || 'U'}{user?.lastName?.[0] || ''}
                  </div>
                  <div className="text-start d-none d-sm-block">
                    <div className="small fw-semibold lh-1">
                      {user?.firstName} {user?.lastName}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                      {user?.memberships?.[0]?.role || 'ADMIN'}
                    </div>
                  </div>
                  <i className="fas fa-chevron-down ms-2 small text-muted"></i>
                </div>
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="position-fixed top-0 start-0 w-100 h-100"
                    style={{ zIndex: 1040 }}
                    onClick={() => setShowUserMenu(false)}
                  ></div>
                  <div
                    className="position-absolute end-0 mt-2 bg-white border rounded shadow-lg"
                    style={{ width: '220px', zIndex: 1050 }}
                  >
                    <div className="p-3 border-bottom">
                      <div className="small fw-bold">{user?.firstName} {user?.lastName}</div>
                      <div className="text-muted small text-truncate">{user?.email}</div>
                    </div>
                    <div className="p-2">
                      <Link
                        to="/settings/workspace"
                        className="btn btn-link text-dark text-decoration-none w-100 text-start small py-2"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <i className="fas fa-building me-2 text-muted"></i>
                        Workspace Settings
                      </Link>
                      <Link
                        to="/settings/team"
                        className="btn btn-link text-dark text-decoration-none w-100 text-start small py-2"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <i className="fas fa-users me-2 text-muted"></i>
                        Team Members
                      </Link>
                      <hr className="my-1" />
                      <button
                        className="btn btn-link text-danger text-decoration-none w-100 text-start small py-2"
                        onClick={handleLogout}
                      >
                        <i className="fas fa-sign-out-alt me-2"></i>
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-fill p-3 p-md-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

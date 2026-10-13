import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useState } from 'react';

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="d-flex min-vh-100">
      {/* Sidebar */}
      <div className="bg-dark text-white" style={{ width: '250px', flexShrink: 0 }}>
        <div className="p-3 border-bottom border-secondary">
          <div className="d-flex align-items-center">
            <i className="fab fa-whatsapp fa-2x text-success me-2"></i>
            <div>
              <div className="fw-bold">WhatsApp AI</div>
              <small className="text-muted">Automation</small>
            </div>
          </div>
        </div>

        <nav className="py-3">
          <Link
            to="/"
            className={`d-flex align-items-center px-3 py-2 text-decoration-none ${
              isActive('/') && location.pathname === '/'
                ? 'bg-primary text-white'
                : 'text-white-50 hover-bg-secondary'
            }`}
          >
            <i className="fas fa-home me-2"></i>
            Dashboard
          </Link>

          <Link
            to="/inbox"
            className={`d-flex align-items-center px-3 py-2 text-decoration-none ${
              isActive('/inbox')
                ? 'bg-primary text-white'
                : 'text-white-50 hover-bg-secondary'
            }`}
          >
            <i className="fas fa-inbox me-2"></i>
            Inbox
          </Link>

          <Link
            to="/contacts"
            className={`d-flex align-items-center px-3 py-2 text-decoration-none ${
              isActive('/contacts')
                ? 'bg-primary text-white'
                : 'text-white-50 hover-bg-secondary'
            }`}
          >
            <i className="fas fa-users me-2"></i>
            Contacts
          </Link>

          <div className="px-3 py-2 text-white-50 small fw-bold mt-3">
            SETTINGS
          </div>

          <Link
            to="/settings/whatsapp"
            className={`d-flex align-items-center px-3 py-2 text-decoration-none ${
              isActive('/settings/whatsapp')
                ? 'bg-primary text-white'
                : 'text-white-50 hover-bg-secondary'
            }`}
          >
            <i className="fab fa-whatsapp me-2"></i>
            WhatsApp
          </Link>

          <Link
            to="/settings/team"
            className={`d-flex align-items-center px-3 py-2 text-decoration-none ${
              isActive('/settings/team')
                ? 'bg-primary text-white'
                : 'text-white-50 hover-bg-secondary'
            }`}
          >
            <i className="fas fa-user-friends me-2"></i>
            Team
          </Link>

          <Link
            to="/settings/workspace"
            className={`d-flex align-items-center px-3 py-2 text-decoration-none ${
              isActive('/settings/workspace')
                ? 'bg-primary text-white'
                : 'text-white-50 hover-bg-secondary'
            }`}
          >
            <i className="fas fa-cog me-2"></i>
            Workspace
          </Link>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-fill d-flex flex-column">
        {/* Header */}
        <header className="bg-white border-bottom px-4 py-3">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h5 className="mb-0">
                {user?.memberships?.[0]?.workspaceName || 'Workspace'}
              </h5>
            </div>

            <div className="position-relative">
              <button
                className="btn btn-link text-dark text-decoration-none p-0"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="d-flex align-items-center">
                  <div className="avatar avatar-sm bg-primary text-white me-2">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </div>
                  <div className="text-start">
                    <div className="small fw-bold">
                      {user?.firstName} {user?.lastName}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      {user?.memberships?.[0]?.role}
                    </div>
                  </div>
                  <i className="fas fa-chevron-down ms-2 small"></i>
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
                    className="position-absolute end-0 mt-2 bg-white border rounded shadow"
                    style={{ width: '200px', zIndex: 1050 }}
                  >
                    <div className="p-2">
                      <button
                        className="btn btn-link text-dark text-decoration-none w-100 text-start"
                        onClick={handleLogout}
                      >
                        <i className="fas fa-sign-out-alt me-2"></i>
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-fill p-4 bg-light">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

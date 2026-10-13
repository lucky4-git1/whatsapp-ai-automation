import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function AuthLayout() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-vh-100 d-flex align-items-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="text-center mb-4">
              <i className="fab fa-whatsapp fa-3x text-success mb-3"></i>
              <h2 className="fw-bold">WhatsApp AI Automation</h2>
              <p className="text-muted">
                Automate your customer conversations with AI
              </p>
            </div>
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}

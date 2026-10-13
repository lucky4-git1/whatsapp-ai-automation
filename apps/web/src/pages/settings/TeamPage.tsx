export default function TeamPage() {
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Team Members</h2>
          <p className="text-muted mb-0">Manage your team and permissions</p>
        </div>
        <button className="btn btn-primary">
          <i className="fas fa-user-plus me-2"></i>
          Invite Member
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="empty-state">
            <i className="fas fa-user-friends fa-3x"></i>
            <h5 className="mt-3">Team Management</h5>
            <p className="text-muted">
              Invite team members and manage their access
            </p>
            <p className="small text-muted">
              This page is under development
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

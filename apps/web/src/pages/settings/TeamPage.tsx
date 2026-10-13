import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'AGENT';
  status: 'ACTIVE' | 'INVITED';
  joinedAt: string;
}

export default function TeamPage() {
  const { user } = useAuthStore();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'AGENT'>('AGENT');

  const [members, setMembers] = useState<TeamMember[]>([
    {
      id: '1',
      name: `${user?.firstName || 'Current'} ${user?.lastName || 'User'}`.trim(),
      email: user?.email || 'admin@whatsapp-ai.com',
      role: 'OWNER',
      status: 'ACTIVE',
      joinedAt: 'Today',
    },
    {
      id: '2',
      name: 'Sarah Connor',
      email: 'sarah.c@company.com',
      role: 'ADMIN',
      status: 'ACTIVE',
      joinedAt: 'Oct 1, 2026',
    },
    {
      id: '3',
      name: 'David Miller',
      email: 'd.miller@company.com',
      role: 'AGENT',
      status: 'ACTIVE',
      joinedAt: 'Oct 5, 2026',
    },
    {
      id: '4',
      name: 'Jessica Chen',
      email: 'jessica@company.com',
      role: 'AGENT',
      status: 'INVITED',
      joinedAt: 'Pending',
    },
  ]);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    const newMember: TeamMember = {
      id: Date.now().toString(),
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole,
      status: 'INVITED',
      joinedAt: 'Just now',
    };

    setMembers([...members, newMember]);
    setShowInviteModal(false);
    setInviteEmail('');
    toast.success(`Invitation sent to ${inviteEmail}`);
  };

  const handleRemove = (id: string, name: string) => {
    if (confirm(`Remove ${name} from the workspace?`)) {
      setMembers(members.filter((m) => m.id !== id));
      toast.success(`${name} removed`);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="mb-1">Team Members</h2>
          <p className="text-muted mb-0">
            Manage your workspace collaborators and access controls
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowInviteModal(true)}
        >
          <i className="fas fa-user-plus me-2"></i>
          Invite Member
        </button>
      </div>

      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="ps-4">Member</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th style={{ width: '100px' }} className="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="ps-4">
                    <div className="d-flex align-items-center">
                      <div className="avatar avatar-sm bg-primary text-white me-3">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="fw-medium text-dark">{member.name}</div>
                        <small className="text-muted">{member.email}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        member.role === 'OWNER'
                          ? 'bg-dark'
                          : member.role === 'ADMIN'
                          ? 'bg-primary'
                          : 'bg-secondary'
                      }`}
                    >
                      {member.role}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        member.status === 'ACTIVE'
                          ? 'bg-success bg-opacity-10 text-success border border-success'
                          : 'bg-warning bg-opacity-10 text-warning border border-warning'
                      }`}
                    >
                      {member.status}
                    </span>
                  </td>
                  <td className="text-muted small">{member.joinedAt}</td>
                  <td className="text-end pe-4">
                    {member.role !== 'OWNER' && (
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleRemove(member.id, member.name)}
                        title="Remove member"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <>
          <div
            className="modal-backdrop fade show"
            style={{ zIndex: 1050 }}
            onClick={() => setShowInviteModal(false)}
          ></div>
          <div
            className="modal fade show d-block"
            tabIndex={-1}
            style={{ zIndex: 1055 }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Invite Team Member</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowInviteModal(false)}
                  ></button>
                </div>
                <form onSubmit={handleInvite}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">Email Address</label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="colleague@company.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Workspace Role</label>
                      <select
                        className="form-select"
                        value={inviteRole}
                        onChange={(e) =>
                          setInviteRole(e.target.value as 'ADMIN' | 'AGENT')
                        }
                      >
                        <option value="AGENT">
                          Support Agent (Manage chats & contacts)
                        </option>
                        <option value="ADMIN">
                          Administrator (Manage settings, integrations & team)
                        </option>
                      </select>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowInviteModal(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Send Invite
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { conversationApi, contactApi, whatsappApi } from '../../lib/api';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const { data: conversations } = useQuery({
    queryKey: ['conversations', { limit: 5 }],
    queryFn: () => conversationApi.list({ limit: 5, sortBy: 'lastMessageAt' }),
  });

  const { data: contacts } = useQuery({
    queryKey: ['contacts', { limit: 5 }],
    queryFn: () => contactApi.list({ limit: 5 }),
  });

  const { data: accounts } = useQuery({
    queryKey: ['whatsapp-accounts'],
    queryFn: () => whatsappApi.listAccounts(),
  });

  const stats = [
    {
      label: 'Total Conversations',
      value: conversations?.data?.meta?.total || 0,
      icon: 'fa-comments',
      color: 'primary',
      link: '/inbox',
    },
    {
      label: 'Open Conversations',
      value: conversations?.data?.data?.filter((c: any) => c.status === 'OPEN')
        .length || 0,
      icon: 'fa-inbox',
      color: 'success',
      link: '/inbox',
    },
    {
      label: 'Total Contacts',
      value: contacts?.data?.meta?.total || 0,
      icon: 'fa-users',
      color: 'info',
      link: '/contacts',
    },
    {
      label: 'WhatsApp Accounts',
      value: accounts?.data?.data?.accounts?.length || 0,
      icon: 'fa-whatsapp',
      color: 'warning',
      link: '/settings/whatsapp',
    },
  ];

  return (
    <div>
      <div className="mb-4">
        <h2 className="mb-1">Dashboard</h2>
        <p className="text-muted">Welcome to your WhatsApp automation workspace</p>
      </div>

      {/* Stats Grid */}
      <div className="row g-3 mb-4">
        {stats.map((stat, index) => (
          <div key={index} className="col-md-6 col-lg-3">
            <Link to={stat.link} className="text-decoration-none">
              <div className="card card-hover h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <div className="text-muted small mb-1">{stat.label}</div>
                      <h3 className="mb-0">{stat.value}</h3>
                    </div>
                    <div
                      className={`rounded p-3 bg-${stat.color} bg-opacity-10`}
                    >
                      <i className={`fas ${stat.icon} fa-lg text-${stat.color}`}></i>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      <div className="row g-4">
        {/* Recent Conversations */}
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Recent Conversations</h5>
              <Link to="/inbox" className="btn btn-sm btn-primary">
                View All
              </Link>
            </div>
            <div className="card-body p-0">
              {conversations?.data?.data?.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-comments"></i>
                  <p>No conversations yet</p>
                  <p className="small text-muted">
                    Conversations will appear here when customers message you
                  </p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {conversations?.data?.data?.map((conv: any) => (
                    <Link
                      key={conv.id}
                      to={`/inbox?conversation=${conv.id}`}
                      className="list-group-item list-group-item-action"
                    >
                      <div className="d-flex align-items-start">
                        <div className="avatar me-3">
                          {conv.contact?.name?.[0] || '?'}
                        </div>
                        <div className="flex-fill">
                          <div className="d-flex justify-content-between mb-1">
                            <h6 className="mb-0">
                              {conv.contact?.name || conv.contact?.phoneNumber}
                            </h6>
                            <small className="text-muted">
                              {new Date(conv.lastMessageAt).toLocaleDateString()}
                            </small>
                          </div>
                          <div className="d-flex align-items-center">
                            <span
                              className={`badge bg-${
                                conv.status === 'OPEN'
                                  ? 'success'
                                  : conv.status === 'PENDING'
                                  ? 'warning'
                                  : 'secondary'
                              } me-2`}
                            >
                              {conv.status}
                            </span>
                            {conv.unreadCount > 0 && (
                              <span className="badge bg-primary">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* WhatsApp Accounts */}
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">WhatsApp Accounts</h5>
              <Link to="/settings/whatsapp" className="btn btn-sm btn-outline-primary">
                Manage
              </Link>
            </div>
            <div className="card-body">
              {accounts?.data?.data?.accounts?.length === 0 ? (
                <div className="text-center py-3">
                  <i className="fab fa-whatsapp fa-3x text-muted mb-3"></i>
                  <p className="text-muted mb-3">No WhatsApp account connected</p>
                  <Link to="/settings/whatsapp" className="btn btn-primary btn-sm">
                    Connect Account
                  </Link>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {accounts?.data?.data?.accounts?.map((account: any) => (
                    <div key={account.id} className="list-group-item px-0">
                      <div className="d-flex align-items-start">
                        <div className="me-2">
                          <i
                            className={`fab fa-whatsapp fa-lg ${
                              account.isConnected ? 'text-success' : 'text-muted'
                            }`}
                          ></i>
                        </div>
                        <div className="flex-fill">
                          <div className="fw-bold">{account.name}</div>
                          <div className="small text-muted">
                            {account.displayPhoneNumber || account.phoneNumber}
                          </div>
                          <span
                            className={`badge mt-1 ${
                              account.isConnected
                                ? 'bg-success'
                                : 'bg-secondary'
                            }`}
                          >
                            {account.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card mt-3">
            <div className="card-header bg-white">
              <h5 className="mb-0">Quick Actions</h5>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <Link to="/contacts" className="btn btn-outline-primary">
                  <i className="fas fa-user-plus me-2"></i>
                  Add Contact
                </Link>
                <Link to="/settings/team" className="btn btn-outline-primary">
                  <i className="fas fa-user-friends me-2"></i>
                  Invite Team Member
                </Link>
                <Link to="/settings/whatsapp" className="btn btn-outline-primary">
                  <i className="fas fa-sync me-2"></i>
                  Sync Templates
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

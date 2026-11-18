import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactApi, conversationApi } from '../../lib/api';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import CreateContactModal from '../../components/contacts/CreateContactModal';
import ImportWizardModal from '../../components/contacts/ImportWizardModal';

export default function ContactsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    consentStatus: '',
    page: 1,
    limit: 20,
  });

  const handleStartChat = async (contactId: string) => {
    try {
      const res = await conversationApi.start(contactId);
      const convId = res.data?.data?.conversation?.id;
      if (convId) {
        navigate(`/inbox?conversation=${convId}`);
      } else {
        navigate('/inbox');
      }
    } catch {
      toast.error('Failed to open chat');
    }
  };

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['contacts', filters],
    queryFn: () => contactApi.list(filters),
  });

  const deleteContactMutation = useMutation({
    mutationFn: (id: string) => contactApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact deleted');
    },
    onError: () => {
      toast.error('Failed to delete contact');
    },
  });

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      deleteContactMutation.mutate(id);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await contactApi.export();
      const csvData = (res.data?.data as any)?.csv || '';
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `contacts-export-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Contacts exported to CSV successfully');
    } catch {
      toast.error('Failed to export contacts');
    }
  };

  const getConsentBadge = (status?: string) => {
    switch (status) {
      case 'OPTED_IN':
        return <span className="badge bg-success-subtle text-success border border-success">OPTED IN</span>;
      case 'OPTED_OUT':
        return <span className="badge bg-danger-subtle text-danger border border-danger">OPTED OUT</span>;
      case 'PENDING':
      default:
        return <span className="badge bg-light text-secondary border">PENDING</span>;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1 fw-bold">Customer Contacts</h2>
          <p className="text-muted mb-0">
            Enterprise WhatsApp CRM, E.164 phone validation, and Meta consent tracking.
          </p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={handleExportCSV}>
            <i className="fas fa-file-export me-1"></i> Export CSV
          </button>
          <button className="btn btn-outline-success" onClick={() => setShowImportModal(true)}>
            <i className="fas fa-file-import me-1"></i> Import Wizard
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <i className="fas fa-plus me-1"></i> Add Contact
          </button>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body">
          {/* Search & Filter Toolbar */}
          <div className="row g-2 mb-3">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="fas fa-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search by name, phone or email..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value, page: 1 })
                  }
                />
              </div>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={filters.consentStatus}
                onChange={(e) =>
                  setFilters({ ...filters, consentStatus: e.target.value, page: 1 })
                }
              >
                <option value="">All Consent Statuses</option>
                <option value="OPTED_IN">Opted In (Broadcast Eligible)</option>
                <option value="OPTED_OUT">Opted Out (Suppressed)</option>
                <option value="PENDING">Pending Verification</option>
              </select>
            </div>
          </div>

          {/* Contacts Table */}
          {(() => {
            const contactList = (contacts?.data?.data as any[]) || [];
            const contactMeta = contacts?.data?.meta;

            if (isLoading) {
              return (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading contacts...</span>
                  </div>
                </div>
              );
            }

            if (contactList.length === 0) {
              return (
                <div className="text-center py-5">
                  <i className="fas fa-address-book fa-3x text-muted mb-3"></i>
                  <h5>No contacts found</h5>
                  <p className="text-muted small mb-3">
                    Add individual contacts or use our 9-step CSV/XLSX Guided Import Wizard.
                  </p>
                  <div className="d-flex justify-content-center gap-2">
                    <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
                      Add Contact
                    </button>
                    <button className="btn btn-outline-success btn-sm" onClick={() => setShowImportModal(true)}>
                      Launch Import Wizard
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light small text-uppercase">
                      <tr>
                        <th>Contact</th>
                        <th>WhatsApp Phone</th>
                        <th>Consent Status</th>
                        <th>Tags</th>
                        <th>Conversations</th>
                        <th>Last Active</th>
                        <th className="text-end" style={{ width: '100px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contactList.map((contact: any) => (
                        <tr key={contact.id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div
                                className="rounded-circle bg-primary bg-opacity-10 text-primary fw-bold d-flex align-items-center justify-content-center me-2"
                                style={{ width: '34px', height: '34px' }}
                              >
                                {contact.name?.[0]?.toUpperCase() || contact.firstName?.[0]?.toUpperCase() || '?'}
                              </div>
                              <div>
                                <Link
                                  to={`/contacts/${contact.id}`}
                                  className="text-decoration-none fw-semibold text-dark"
                                >
                                  {contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unknown'}
                                </Link>
                                {contact.email && (
                                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                    {contact.email}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <code className="text-dark bg-light px-2 py-1 rounded small">
                              {contact.phoneNumber}
                            </code>
                          </td>
                          <td>{getConsentBadge(contact.consentStatus)}</td>
                          <td>
                            {contact.tags?.length > 0 ? (
                              <div className="d-flex gap-1 flex-wrap">
                                {contact.tags.slice(0, 2).map((tag: any, idx: number) => (
                                  <span
                                    key={tag.id || idx}
                                    className="badge bg-secondary-subtle text-secondary border"
                                  >
                                    {typeof tag === 'string' ? tag : tag.tag}
                                  </span>
                                ))}
                                {contact.tags.length > 2 && (
                                  <span className="badge bg-light text-dark border">
                                    +{contact.tags.length - 2}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted small">-</span>
                            )}
                          </td>
                          <td>
                            <span className="badge bg-light text-dark border">
                              {contact._count?.conversations || 0} chats
                            </span>
                          </td>
                          <td>
                            {contact.lastInteractionAt ? (
                              <small className="text-muted">
                                {new Date(contact.lastInteractionAt).toLocaleDateString()}
                              </small>
                            ) : (
                              <span className="text-muted small">Never</span>
                            )}
                          </td>
                          <td className="text-end">
                            <div className="btn-group btn-group-sm">
                              <button
                                className="btn btn-outline-success"
                                title="Chat on WhatsApp"
                                onClick={() => handleStartChat(contact.id)}
                              >
                                <i className="fab fa-whatsapp"></i>
                              </button>
                              <Link
                                to={`/contacts/${contact.id}`}
                                className="btn btn-outline-primary"
                                title="View details"
                              >
                                <i className="fas fa-eye"></i>
                              </Link>
                              <button
                                className="btn btn-outline-danger"
                                title="Delete contact"
                                onClick={() =>
                                  handleDelete(
                                    contact.id,
                                    contact.name || contact.phoneNumber
                                  )
                                }
                                disabled={deleteContactMutation.isPending}
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {contactMeta && (
                  <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                    <div className="text-muted small">
                      Showing {((filters.page - 1) * filters.limit) + 1} to{' '}
                      {Math.min(filters.page * filters.limit, contactMeta.total || 0)} of{' '}
                      {contactMeta.total || 0} contacts
                    </div>
                    <nav>
                      <ul className="pagination pagination-sm mb-0">
                        <li className={`page-item ${filters.page === 1 ? 'disabled' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                          >
                            Previous
                          </button>
                        </li>
                        <li className="page-item active">
                          <span className="page-link">{filters.page}</span>
                        </li>
                        <li className={`page-item ${!contactMeta.hasMore ? 'disabled' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                          >
                            Next
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Modals */}
      <CreateContactModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      <ImportWizardModal
        show={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </div>
  );
}

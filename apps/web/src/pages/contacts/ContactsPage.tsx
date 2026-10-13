import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactApi } from '../../lib/api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import CreateContactModal from '../../components/contacts/CreateContactModal';

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    page: 1,
    limit: 20,
  });

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

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Contacts</h2>
          <p className="text-muted mb-0">
            Manage your customer contacts
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          <i className="fas fa-plus me-2"></i>
          Add Contact
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          {/* Search */}
          <div className="row mb-3">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="fas fa-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search contacts..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value, page: 1 })
                  }
                />
              </div>
            </div>
          </div>

          {/* Contacts Table */}
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : contacts?.data?.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-users"></i>
              <p>No contacts found</p>
              <button
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                Add Your First Contact
              </button>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>Tags</th>
                      <th>Conversations</th>
                      <th>Last Interaction</th>
                      <th width="100">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts?.data?.map((contact: any) => (
                      <tr key={contact.id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="avatar avatar-sm me-2">
                              {contact.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <Link
                              to={`/contacts/${contact.id}`}
                              className="text-decoration-none fw-medium"
                            >
                              {contact.name || 'Unknown'}
                            </Link>
                          </div>
                        </td>
                        <td>
                          <code className="small">{contact.phoneNumber}</code>
                        </td>
                        <td>
                          {contact.email ? (
                            <small>{contact.email}</small>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          {contact.tags?.length > 0 ? (
                            <div className="d-flex gap-1 flex-wrap">
                              {contact.tags.slice(0, 2).map((tag: any) => (
                                <span
                                  key={tag.id}
                                  className="badge bg-secondary"
                                >
                                  {tag.tag}
                                </span>
                              ))}
                              {contact.tags.length > 2 && (
                                <span className="badge bg-light text-dark">
                                  +{contact.tags.length - 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          <span className="badge bg-primary">
                            {contact._count?.conversations || 0}
                          </span>
                        </td>
                        <td>
                          {contact.lastInteractionAt ? (
                            <small className="text-muted">
                              {new Date(
                                contact.lastInteractionAt
                              ).toLocaleDateString()}
                            </small>
                          ) : (
                            <span className="text-muted">Never</span>
                          )}
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <Link
                              to={`/contacts/${contact.id}`}
                              className="btn btn-sm btn-outline-primary"
                            >
                              <i className="fas fa-eye"></i>
                            </Link>
                            <button
                              className="btn btn-sm btn-outline-danger"
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
              {contacts?.meta && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <div className="text-muted">
                    Showing {((filters.page - 1) * filters.limit) + 1} to{' '}
                    {Math.min(filters.page * filters.limit, contacts.meta.total)} of{' '}
                    {contacts.meta.total} contacts
                  </div>
                  <nav>
                    <ul className="pagination mb-0">
                      <li
                        className={`page-item ${
                          filters.page === 1 ? 'disabled' : ''
                        }`}
                      >
                        <button
                          className="page-link"
                          onClick={() =>
                            setFilters({ ...filters, page: filters.page - 1 })
                          }
                        >
                          Previous
                        </button>
                      </li>
                      <li className="page-item active">
                        <span className="page-link">{filters.page}</span>
                      </li>
                      <li
                        className={`page-item ${
                          !contacts.meta.hasMore ? 'disabled' : ''
                        }`}
                      >
                        <button
                          className="page-link"
                          onClick={() =>
                            setFilters({ ...filters, page: filters.page + 1 })
                          }
                        >
                          Next
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <CreateContactModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}

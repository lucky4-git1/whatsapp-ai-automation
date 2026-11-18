import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { contactApi, conversationApi } from '../../lib/api';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isStartingChat, setIsStartingChat] = useState(false);

  const { data: contact, isLoading } = useQuery({
    queryKey: ['contact', id],
    queryFn: () => contactApi.get(id!),
    enabled: !!id,
  });

  const handleStartChat = async () => {
    if (!id) return;
    try {
      setIsStartingChat(true);
      const res = await conversationApi.start(id);
      const convId = res.data?.data?.conversation?.id;
      if (convId) {
        navigate(`/inbox?conversation=${convId}`);
      } else {
        navigate('/inbox');
      }
    } catch {
      toast.error('Failed to open WhatsApp conversation');
    } finally {
      setIsStartingChat(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const contactData = contact?.data?.data?.contact;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link to="/contacts" className="text-decoration-none text-muted mb-2 d-inline-block">
            <i className="fas fa-arrow-left me-2"></i>
            Back to Contacts
          </Link>
          <h2 className="mb-0">
            {contactData?.name || contactData?.phoneNumber}
          </h2>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-success"
            onClick={handleStartChat}
            disabled={isStartingChat}
          >
            <i className="fab fa-whatsapp me-2"></i>
            {isStartingChat ? 'Opening Chat...' : 'Chat on WhatsApp'}
          </button>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-md-4">
          <div className="card">
            <div className="card-body text-center">
              <div className="avatar avatar-lg mx-auto mb-3 bg-primary text-white">
                {contactData?.name?.[0]?.toUpperCase() || '?'}
              </div>
              <h5>{contactData?.name || 'Unknown'}</h5>
              <p className="text-muted mb-3">{contactData?.phoneNumber}</p>
              {contactData?.email && (
                <p className="small text-muted mb-0">{contactData.email}</p>
              )}
            </div>
          </div>

          {contactData?.tags && contactData.tags.length > 0 && (
            <div className="card mt-3">
              <div className="card-header bg-white">
                <h6 className="mb-0">Tags</h6>
              </div>
              <div className="card-body">
                <div className="d-flex flex-wrap gap-2">
                  {contactData.tags.map((tag: any) => (
                    <span key={tag.id} className="badge bg-secondary">
                      {tag.tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="col-md-8">
          <div className="card">
            <div className="card-header bg-white">
              <h6 className="mb-0">Recent Conversations</h6>
            </div>
            <div className="card-body">
              {contactData?.conversations?.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-comments"></i>
                  <p>No conversations yet</p>
                </div>
              ) : (
                <div className="list-group">
                  {contactData?.conversations?.map((conv: any) => (
                    <Link
                      key={conv.id}
                      to={`/inbox?conversation=${conv.id}`}
                      className="list-group-item list-group-item-action"
                    >
                      <div className="d-flex justify-content-between">
                        <div>
                          <span className={`badge bg-${
                            conv.status === 'OPEN' ? 'success' : 'secondary'
                          }`}>
                            {conv.status}
                          </span>
                          <span className="ms-2">
                            {conv.unreadCount > 0 && (
                              <span className="badge bg-primary">
                                {conv.unreadCount} unread
                              </span>
                            )}
                          </span>
                        </div>
                        <small className="text-muted">
                          {new Date(conv.lastMessageAt).toLocaleDateString()}
                        </small>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

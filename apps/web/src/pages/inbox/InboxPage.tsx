import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { conversationApi } from '../../lib/api';
import { useSearchParams } from 'react-router-dom';
import ConversationList from '../../components/inbox/ConversationList';
import ConversationDetail from '../../components/inbox/ConversationDetail';

export default function InboxPage() {
  const [searchParams] = useSearchParams();
  const selectedConversationId = searchParams.get('conversation');
  const [filters, setFilters] = useState({
    status: '',
    search: '',
  });

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations', filters],
    queryFn: () => conversationApi.list(filters),
  });

  return (
    <div>
      <div className="mb-4">
        <h2 className="mb-1">Inbox</h2>
        <p className="text-muted">Manage your customer conversations</p>
      </div>

      <div className="card">
        <div className="row g-0" style={{ height: 'calc(100vh - 250px)' }}>
          {/* Conversation List */}
          <div className="col-md-4 border-end">
            <div className="p-3 border-bottom">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="fas fa-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search conversations..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                />
              </div>

              <div className="btn-group w-100 mt-2" role="group">
                <button
                  className={`btn btn-sm ${
                    filters.status === '' ? 'btn-primary' : 'btn-outline-primary'
                  }`}
                  onClick={() => setFilters({ ...filters, status: '' })}
                >
                  All
                </button>
                <button
                  className={`btn btn-sm ${
                    filters.status === 'OPEN'
                      ? 'btn-primary'
                      : 'btn-outline-primary'
                  }`}
                  onClick={() => setFilters({ ...filters, status: 'OPEN' })}
                >
                  Open
                </button>
                <button
                  className={`btn btn-sm ${
                    filters.status === 'ASSIGNED'
                      ? 'btn-primary'
                      : 'btn-outline-primary'
                  }`}
                  onClick={() => setFilters({ ...filters, status: 'ASSIGNED' })}
                >
                  Assigned
                </button>
              </div>
            </div>

            <div className="overflow-auto" style={{ height: 'calc(100% - 120px)' }}>
              {isLoading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : conversations?.data?.data?.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-inbox"></i>
                  <p>No conversations found</p>
                </div>
              ) : (
                <ConversationList
                  conversations={conversations?.data?.data || []}
                  selectedId={selectedConversationId || ''}
                />
              )}
            </div>
          </div>

          {/* Conversation Detail */}
          <div className="col-md-8">
            {selectedConversationId ? (
              <ConversationDetail conversationId={selectedConversationId} />
            ) : (
              <div className="d-flex align-items-center justify-content-center h-100">
                <div className="text-center text-muted">
                  <i className="fas fa-comments fa-4x mb-3 opacity-25"></i>
                  <h5>Select a conversation</h5>
                  <p>Choose a conversation from the list to view messages</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

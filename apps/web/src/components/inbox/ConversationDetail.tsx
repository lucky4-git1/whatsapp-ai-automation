import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conversationApi } from '../../lib/api';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

interface ConversationDetailProps {
  conversationId: string;
}

export default function ConversationDetail({
  conversationId,
}: ConversationDetailProps) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');

  const { data: conversation, isLoading } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => conversationApi.get(conversationId),
    enabled: !!conversationId,
  });

  const toggleAiMutation = useMutation({
    mutationFn: (isAiEnabled: boolean) =>
      conversationApi.toggleAi(conversationId, isAiEnabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      toast.success('AI mode updated');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) =>
      conversationApi.updateStatus(conversationId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Status updated');
    },
  });

  if (isLoading) {
    return (
      <div className="d-flex align-items-center justify-content-center h-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const conv = conversation?.data?.data?.conversation;
  if (!conv) return null;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    // Message sending will be implemented with WebSocket or API
    toast.info('Message sending will be implemented');
    setMessage('');
  };

  return (
    <div className="d-flex flex-column h-100">
      {/* Header */}
      <div className="p-3 border-bottom bg-white">
        <div className="d-flex justify-content-between align-items-start">
          <div className="d-flex align-items-center">
            <div className="avatar avatar-lg me-3">
              {conv.contact?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <h5 className="mb-0">
                {conv.contact?.name || conv.contact?.phoneNumber}
              </h5>
              <div className="d-flex align-items-center gap-2 mt-1">
                <small className="text-muted">{conv.contact?.phoneNumber}</small>
                <span
                  className={`badge ${
                    conv.status === 'OPEN'
                      ? 'bg-success'
                      : conv.status === 'ASSIGNED'
                      ? 'bg-primary'
                      : 'bg-secondary'
                  }`}
                >
                  {conv.status}
                </span>
              </div>
            </div>
          </div>

          <div className="d-flex gap-2">
            <button
              className={`btn btn-sm ${
                conv.isAiEnabled ? 'btn-primary' : 'btn-outline-primary'
              }`}
              onClick={() => toggleAiMutation.mutate(!conv.isAiEnabled)}
              disabled={toggleAiMutation.isPending}
            >
              <i className="fas fa-robot me-1"></i>
              {conv.isAiEnabled ? 'AI On' : 'AI Off'}
            </button>

            <div className="dropdown">
              <button
                className="btn btn-sm btn-outline-secondary dropdown-toggle"
                type="button"
                data-bs-toggle="dropdown"
              >
                Actions
              </button>
              <ul className="dropdown-menu">
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => updateStatusMutation.mutate('ASSIGNED')}
                  >
                    Mark as Assigned
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => updateStatusMutation.mutate('RESOLVED')}
                  >
                    Mark as Resolved
                  </button>
                </li>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => updateStatusMutation.mutate('ARCHIVED')}
                  >
                    Archive
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-fill overflow-auto p-3 bg-light">
        {conv.messages?.length === 0 ? (
          <div className="text-center text-muted py-5">
            <i className="fas fa-comments fa-3x mb-3 opacity-25"></i>
            <p>No messages yet</p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {conv.messages?.map((msg: any) => (
              <div
                key={msg.id}
                className={`d-flex ${
                  msg.direction === 'OUTBOUND'
                    ? 'justify-content-end'
                    : 'justify-content-start'
                }`}
              >
                <div
                  className={`message-bubble ${
                    msg.direction === 'OUTBOUND' ? 'outbound' : 'inbound'
                  }`}
                >
                  <div>{msg.content}</div>
                  <div
                    className="d-flex align-items-center justify-content-between mt-1"
                    style={{ fontSize: '0.75rem', opacity: 0.7 }}
                  >
                    <span>
                      {formatDistanceToNow(new Date(msg.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                    {msg.direction === 'OUTBOUND' && (
                      <span className="ms-2">
                        {msg.status === 'DELIVERED' && (
                          <i className="fas fa-check-double"></i>
                        )}
                        {msg.status === 'READ' && (
                          <i className="fas fa-check-double text-primary"></i>
                        )}
                        {msg.status === 'SENT' && <i className="fas fa-check"></i>}
                        {msg.status === 'FAILED' && (
                          <i className="fas fa-exclamation-circle text-danger"></i>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="p-3 border-top bg-white">
        <form onSubmit={handleSendMessage}>
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!message.trim()}
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </form>
      </div>

      {/* Contact Info Sidebar - Optional */}
      {conv.notes && conv.notes.length > 0 && (
        <div className="border-top p-3 bg-white">
          <h6 className="mb-2">Internal Notes</h6>
          {conv.notes.map((note: any) => (
            <div key={note.id} className="mb-2">
              <small className="text-muted">
                {note.user.firstName} {note.user.lastName} -{' '}
                {formatDistanceToNow(new Date(note.createdAt), {
                  addSuffix: true,
                })}
              </small>
              <p className="mb-0 small">{note.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

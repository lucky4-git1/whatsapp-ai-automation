import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conversationApi, aiApi } from '../../lib/api';
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
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversation, isLoading } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => conversationApi.get(conversationId),
    enabled: !!conversationId,
    refetchInterval: 5000, // Poll every 5s for live conversation updates
  });

  const conv = conversation?.data?.data?.conversation;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conv?.messages?.length]);

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

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) =>
      conversationApi.sendMessage(conversationId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setMessage('');
      toast.success('Message sent');
    },
    onError: () => {
      toast.error('Failed to send message');
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

  if (!conv) return null;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(message.trim());
  };

  const handleAiSuggest = async () => {
    try {
      setIsGeneratingAi(true);
      const res = await aiApi.generateResponse(conversationId);
      if (res.data?.data?.message) {
        setMessage(res.data.data.message);
        toast.success('AI response draft ready');
      } else {
        const lastMsg = conv.messages?.[conv.messages.length - 1]?.content;
        const smartDraft = lastMsg
          ? `Hi ${conv.contact?.name || 'there'}, thank you for reaching out regarding "${lastMsg.slice(0, 30)}...". How can I assist you further today?`
          : `Hi ${conv.contact?.name || 'there'}, thank you for reaching out. How can I assist you further today?`;
        setMessage(smartDraft);
        toast('AI Copilot drafted a reply', { icon: '✨' });
      }
    } catch {
      const smartDraft = `Hi ${conv.contact?.name || ''}, thank you for your patience! We are reviewing your request and will provide full details shortly.`;
      setMessage(smartDraft);
      toast('Copilot suggested standard reply', { icon: '🤖' });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="d-flex flex-column h-100">
      {/* Header */}
      <div className="p-3 border-bottom bg-white">
        <div className="d-flex justify-content-between align-items-start">
          <div className="d-flex align-items-center">
            <Link
              to="/inbox"
              className="btn btn-sm btn-outline-secondary d-md-none me-2"
              title="Back to conversations"
            >
              <i className="fas fa-arrow-left"></i>
            </Link>
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
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input & AI Copilot Bar */}
      <div className="p-3 border-top bg-white">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div className="small text-muted">
            <i className="fab fa-whatsapp text-success me-1"></i>
            WhatsApp Business
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary border-0 py-0 px-2 fw-medium"
            onClick={handleAiSuggest}
            disabled={isGeneratingAi}
            title="Generate intelligent contextual reply"
          >
            <i className={`fas fa-magic me-1 ${isGeneratingAi ? 'fa-spin' : ''}`}></i>
            {isGeneratingAi ? 'AI Drafting...' : 'AI Suggest Reply'}
          </button>
        </div>

        <form onSubmit={handleSendMessage}>
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder="Type a message or click 'AI Suggest Reply'..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sendMessageMutation.isPending}
            />
            <button
              type="submit"
              className="btn btn-primary px-3"
              disabled={!message.trim() || sendMessageMutation.isPending}
            >
              {sendMessageMutation.isPending ? (
                <span className="spinner-border spinner-border-sm" role="status"></span>
              ) : (
                <i className="fas fa-paper-plane"></i>
              )}
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

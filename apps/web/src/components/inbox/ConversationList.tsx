import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface ConversationListProps {
  conversations: any[];
  selectedId: string;
}

export default function ConversationList({
  conversations,
  selectedId,
}: ConversationListProps) {
  return (
    <div>
      {conversations.map((conversation) => (
        <Link
          key={conversation.id}
          to={`/inbox?conversation=${conversation.id}`}
          className={`conversation-item ${
            conversation.id === selectedId ? 'active' : ''
          } ${conversation.unreadCount > 0 ? 'unread' : ''} text-decoration-none`}
        >
          <div className="d-flex align-items-start">
            <div className="avatar me-3">
              {conversation.contact?.name?.[0]?.toUpperCase() || 
               conversation.contact?.phoneNumber?.[0] || '?'}
            </div>
            <div className="flex-fill overflow-hidden">
              <div className="d-flex justify-content-between align-items-start mb-1">
                <h6 className="mb-0 text-truncate">
                  {conversation.contact?.name || conversation.contact?.phoneNumber}
                </h6>
                <small className="text-muted flex-shrink-0 ms-2">
                  {conversation.lastMessageAt &&
                    formatDistanceToNow(new Date(conversation.lastMessageAt), {
                      addSuffix: true,
                    })}
                </small>
              </div>

              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center flex-fill overflow-hidden">
                  {conversation.messages?.[0]?.content && (
                    <p className="mb-0 text-muted small text-truncate me-2">
                      {conversation.messages[0].direction === 'OUTBOUND' && (
                        <i className="fas fa-reply me-1"></i>
                      )}
                      {conversation.messages[0].content}
                    </p>
                  )}
                </div>

                <div className="d-flex align-items-center gap-2 flex-shrink-0">
                  <span
                    className={`badge badge-sm ${
                      conversation.status === 'OPEN'
                        ? 'bg-success'
                        : conversation.status === 'ASSIGNED'
                        ? 'bg-primary'
                        : conversation.status === 'PENDING'
                        ? 'bg-warning'
                        : 'bg-secondary'
                    }`}
                  >
                    {conversation.status}
                  </span>

                  {conversation.unreadCount > 0 && (
                    <span className="badge bg-primary rounded-circle">
                      {conversation.unreadCount}
                    </span>
                  )}

                  {!conversation.isAiEnabled && (
                    <i
                      className="fas fa-user-tie text-primary"
                      title="Human mode"
                    ></i>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

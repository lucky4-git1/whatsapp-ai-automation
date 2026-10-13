import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tantml:react-query';
import { whatsappApi } from '../../lib/api';
import toast from 'react-hot-toast';
import ConnectWhatsAppModal from '../../components/whatsapp/ConnectWhatsAppModal';

export default function WhatsAppAccountsPage() {
  const queryClient = useQueryClient();
  const [showConnectModal, setShowConnectModal] = useState(false);

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['whatsapp-accounts'],
    queryFn: () => whatsappApi.listAccounts(),
  });

  const syncTemplatesMutation = useMutation({
    mutationFn: (accountId: string) => whatsappApi.syncTemplates(accountId),
    onSuccess: () => {
      toast.success('Templates synced successfully');
    },
    onError: () => {
      toast.error('Failed to sync templates');
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (accountId: string) => whatsappApi.disconnectAccount(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
      toast.success('Account disconnected');
    },
    onError: () => {
      toast.error('Failed to disconnect account');
    },
  });

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">WhatsApp Accounts</h2>
          <p className="text-muted mb-0">
            Connect and manage your WhatsApp Business accounts
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowConnectModal(true)}
        >
          <i className="fab fa-whatsapp me-2"></i>
          Connect Account
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : accounts?.data?.data?.accounts?.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <i className="fab fa-whatsapp fa-4x"></i>
              <h5 className="mt-3">No WhatsApp Account Connected</h5>
              <p className="text-muted">
                Connect your WhatsApp Business account to start automating
                conversations
              </p>
              <button
                className="btn btn-primary"
                onClick={() => setShowConnectModal(true)}
              >
                <i className="fab fa-whatsapp me-2"></i>
                Connect WhatsApp Account
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          {accounts?.data?.data?.accounts?.map((account: any) => (
            <div key={account.id} className="col-md-6">
              <div className="card h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div className="d-flex align-items-center">
                      <i
                        className={`fab fa-whatsapp fa-2x me-3 ${
                          account.isConnected ? 'text-success' : 'text-muted'
                        }`}
                      ></i>
                      <div>
                        <h5 className="mb-0">{account.name}</h5>
                        <small className="text-muted">
                          {account.displayPhoneNumber || account.phoneNumber}
                        </small>
                      </div>
                    </div>
                    <span
                      className={`badge ${
                        account.isConnected ? 'bg-success' : 'bg-secondary'
                      }`}
                    >
                      {account.status}
                    </span>
                  </div>

                  <div className="mb-3">
                    <div className="row g-2 text-center">
                      <div className="col-6">
                        <div className="border rounded p-2">
                          <div className="fw-bold">{account._count?.conversations || 0}</div>
                          <small className="text-muted">Conversations</small>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="border rounded p-2">
                          <div className="fw-bold">{account._count?.messages || 0}</div>
                          <small className="text-muted">Messages</small>
                        </div>
                      </div>
                    </div>
                  </div>

                  {account.verifiedName && (
                    <div className="mb-2">
                      <small className="text-muted">Verified Name:</small>
                      <div>{account.verifiedName}</div>
                    </div>
                  )}

                  {account.qualityRating && (
                    <div className="mb-3">
                      <small className="text-muted">Quality Rating:</small>
                      <div>
                        <span className="badge bg-success">
                          {account.qualityRating}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-outline-primary flex-fill"
                      onClick={() => syncTemplatesMutation.mutate(account.id)}
                      disabled={syncTemplatesMutation.isPending}
                    >
                      <i className="fas fa-sync me-1"></i>
                      Sync Templates
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => {
                        if (confirm('Are you sure you want to disconnect this account?')) {
                          disconnectMutation.mutate(account.id);
                        }
                      }}
                      disabled={disconnectMutation.isPending}
                    >
                      <i className="fas fa-unlink"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConnectWhatsAppModal
        show={showConnectModal}
        onClose={() => setShowConnectModal(false)}
      />
    </div>
  );
}

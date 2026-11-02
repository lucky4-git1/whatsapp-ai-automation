import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { whatsappApi } from '../../lib/api';
import toast from 'react-hot-toast';

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const { data: accountsData } = useQuery({
    queryKey: ['whatsapp-accounts'],
    queryFn: () => whatsappApi.listAccounts(),
  });
  const accounts = accountsData?.data?.data?.accounts || [];

  const currentAccountId = selectedAccountId || (accounts.length > 0 ? accounts[0].id : '');

  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['whatsapp-templates', currentAccountId],
    queryFn: () => whatsappApi.getTemplates(currentAccountId),
    enabled: !!currentAccountId,
  });
  const templates = (templatesData?.data?.data?.templates as any[]) || [];

  const syncMutation = useMutation({
    mutationFn: () => whatsappApi.syncTemplates(currentAccountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates', currentAccountId] });
      toast.success('Templates synchronized from Meta Cloud API');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to sync templates');
    },
  });

  const filteredTemplates = templates.filter((tpl) => {
    if (categoryFilter === 'ALL') return true;
    return (tpl.category || 'MARKETING').toUpperCase() === categoryFilter;
  });

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1 fw-bold">Message Templates</h2>
          <p className="text-muted mb-0">
            Meta-approved WhatsApp message templates for outbound broadcasts and automated alerts.
          </p>
        </div>
        <div className="d-flex gap-2">
          {accounts.length > 0 && (
            <select
              className="form-select form-select-sm"
              style={{ width: '220px' }}
              value={currentAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
            >
              {accounts.map((acc: any) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.displayPhoneNumber || acc.phoneNumber})
                </option>
              ))}
            </select>
          )}
          <button
            className="btn btn-primary btn-sm"
            onClick={() => syncMutation.mutate()}
            disabled={!currentAccountId || syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" /> Syncing...
              </>
            ) : (
              <>
                <i className="fas fa-sync me-1"></i> Sync from Meta
              </>
            )}
          </button>
        </div>
      </div>

      {/* Meta Guidelines Banner */}
      <div className="alert alert-light border shadow-sm mb-4">
        <div className="d-flex gap-3 align-items-center">
          <i className="fab fa-meta fa-2x text-primary"></i>
          <div className="small">
            <strong>Meta Cloud API Template Rules:</strong> Marketing and promotional broadcasts require pre-approved templates with category categorization. Custom variables like <code>{`{{1}}`}</code> are replaced dynamically upon campaign execution.
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="btn-group btn-group-sm">
          {['ALL', 'MARKETING', 'UTILITY', 'AUTHENTICATION'].map((cat) => (
            <button
              key={cat}
              className={`btn ${categoryFilter === cat ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <small className="text-muted">{filteredTemplates.length} templates available</small>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading templates...</span>
          </div>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="card border-0 shadow-sm text-center py-5">
          <div className="card-body">
            <i className="far fa-file-alt fa-3x text-muted mb-3"></i>
            <h5>No message templates found</h5>
            <p className="text-muted small mb-3">
              Sync templates from your Meta Business account or submit templates in WhatsApp Business Manager.
            </p>
            {currentAccountId && (
              <button
                className="btn btn-outline-primary btn-sm"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
              >
                <i className="fas fa-sync me-1"></i> Sync from Meta Now
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="row g-4">
          {filteredTemplates.map((tpl: any) => {
            const bodyComponent = tpl.components?.find((c: any) => c.type === 'BODY');
            const buttonsComponent = tpl.components?.find((c: any) => c.type === 'BUTTONS');

            return (
              <div key={tpl.id || tpl.name} className="col-md-6 col-lg-4">
                <div className="card shadow-sm border-0 h-100 d-flex flex-column">
                  <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-bold font-monospace text-dark text-truncate" style={{ maxWidth: '180px' }}>
                        {tpl.name}
                      </div>
                      <small className="text-muted">{tpl.language || 'en_US'}</small>
                    </div>
                    <span className="badge bg-success">
                      {tpl.status || 'APPROVED'}
                    </span>
                  </div>

                  <div className="card-body flex-fill d-flex flex-column">
                    <div className="mb-2">
                      <span className="badge bg-light text-secondary border me-1">
                        {tpl.category || 'MARKETING'}
                      </span>
                    </div>

                    {/* WhatsApp Chat Preview Bubble */}
                    <div
                      className="p-3 rounded flex-fill mb-3"
                      style={{
                        backgroundColor: '#E7FFDB',
                        border: '1px solid #cce8bd',
                        fontSize: '0.875rem',
                      }}
                    >
                      <div className="text-dark" style={{ whiteSpace: 'pre-line' }}>
                        {bodyComponent?.text || tpl.name}
                      </div>

                      {buttonsComponent?.buttons?.length > 0 && (
                        <div className="mt-3 pt-2 border-top border-success border-opacity-25">
                          {buttonsComponent.buttons.map((btn: any, idx: number) => (
                            <div
                              key={idx}
                              className="text-center text-primary fw-semibold py-1 small border rounded bg-white mb-1"
                            >
                              <i className="fas fa-external-link-alt me-1"></i> {btn.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="d-flex justify-content-between align-items-center mt-auto small text-muted">
                      <span>Meta ID: {tpl.id ? String(tpl.id).slice(-8) : 'Synced'}</span>
                      <button
                        className="btn btn-link btn-sm text-decoration-none p-0 text-success fw-semibold"
                        onClick={() => {
                          navigator.clipboard.writeText(bodyComponent?.text || tpl.name);
                          toast.success('Template text copied to clipboard');
                        }}
                      >
                        <i className="fas fa-copy me-1"></i> Copy Text
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

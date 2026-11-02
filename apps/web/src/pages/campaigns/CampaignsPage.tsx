import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignApi } from '../../lib/api';
import toast from 'react-hot-toast';
import CampaignBuilderModal from '../../components/campaigns/CampaignBuilderModal';

export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const [showBuilder, setShowBuilder] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignApi.list(),
  });

  const campaigns = (data?.data?.data?.campaigns as any[]) || [];

  const launchMutation = useMutation({
    mutationFn: (id: string) => campaignApi.launch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign launched successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to launch campaign');
    },
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => campaignApi.pause(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign paused');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to pause campaign');
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => campaignApi.resume(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign resumed');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to resume campaign');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => campaignApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign cancelled');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to cancel campaign');
    },
  });

  const filteredCampaigns = campaigns.filter((c) => {
    if (filterStatus === 'ALL') return true;
    return c.status === filterStatus;
  });

  const totalSent = campaigns.reduce((acc, c) => acc + (c.sentCount || 0), 0);
  const totalDelivered = campaigns.reduce((acc, c) => acc + (c.deliveredCount || 0), 0);
  const totalRead = campaigns.reduce((acc, c) => acc + (c.readCount || 0), 0);
  const readRate = totalDelivered > 0 ? ((totalRead / totalDelivered) * 100).toFixed(1) : '0.0';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="badge bg-success">Completed</span>;
      case 'PROCESSING':
        return <span className="badge bg-primary">Processing</span>;
      case 'SCHEDULED':
        return <span className="badge bg-info text-dark">Scheduled</span>;
      case 'PAUSED':
        return <span className="badge bg-warning text-dark">Paused</span>;
      case 'CANCELLED':
        return <span className="badge bg-secondary">Cancelled</span>;
      case 'DRAFT':
      default:
        return <span className="badge bg-light text-dark border">Draft</span>;
    }
  };

  return (
    <div>
      {/* Top Banner */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1 fw-bold">Broadcast Campaigns</h2>
          <p className="text-muted mb-0">
            Create, schedule and monitor bulk WhatsApp outreach with Meta Cloud API compliance.
          </p>
        </div>
        <button
          className="btn btn-success d-flex align-items-center gap-2"
          onClick={() => setShowBuilder(true)}
        >
          <i className="fas fa-paper-plane"></i>
          <span>Create Campaign</span>
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <div className="text-muted small fw-semibold text-uppercase">Total Campaigns</div>
              <h3 className="fw-bold mt-2 mb-0">{campaigns.length}</h3>
              <small className="text-muted">All active & past broadcasts</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <div className="text-muted small fw-semibold text-uppercase">Messages Sent</div>
              <h3 className="fw-bold mt-2 mb-0 text-primary">{totalSent.toLocaleString()}</h3>
              <small className="text-muted">Dispatched via Meta Cloud</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <div className="text-muted small fw-semibold text-uppercase">Delivered</div>
              <h3 className="fw-bold mt-2 mb-0 text-success">{totalDelivered.toLocaleString()}</h3>
              <small className="text-muted">Handset delivery confirmed</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <div className="text-muted small fw-semibold text-uppercase">Avg. Read Rate</div>
              <h3 className="fw-bold mt-2 mb-0 text-info">{readRate}%</h3>
              <small className="text-muted">Delivered to read conversion</small>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign List */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <span className="fw-bold">Campaign Registry</span>
            <span className="badge bg-light text-dark border">{filteredCampaigns.length} total</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <label className="small text-muted mb-0">Filter Status:</label>
            <select
              className="form-select form-select-sm"
              style={{ width: '160px' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Completed</option>
              <option value="PAUSED">Paused</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="card-body p-0">
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading campaigns...</span>
              </div>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-bullhorn fa-3x text-muted mb-3"></i>
              <h5>No campaigns found</h5>
              <p className="text-muted small mb-3">
                {filterStatus !== 'ALL'
                  ? `No campaigns match the filter "${filterStatus}".`
                  : 'Start your first WhatsApp outreach campaign with our 10-step wizard.'}
              </p>
              <button
                className="btn btn-outline-success btn-sm"
                onClick={() => setShowBuilder(true)}
              >
                <i className="fas fa-plus me-1"></i> New Campaign
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light text-muted small text-uppercase">
                  <tr>
                    <th className="ps-4">Campaign</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Sent</th>
                    <th>Delivered</th>
                    <th>Read Rate</th>
                    <th>Created</th>
                    <th className="text-end pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCampaigns.map((camp) => {
                    const deliveredPct = camp.sentCount > 0
                      ? Math.round((camp.deliveredCount / camp.sentCount) * 100)
                      : 0;
                    const readPct = camp.deliveredCount > 0
                      ? Math.round((camp.readCount / camp.deliveredCount) * 100)
                      : 0;

                    return (
                      <tr key={camp.id}>
                        <td className="ps-4">
                          <div className="fw-semibold text-dark">{camp.name}</div>
                          <small className="text-muted">{camp.description || 'No description'}</small>
                        </td>
                        <td>
                          <span className="badge bg-light text-secondary border">
                            {camp.type}
                          </span>
                        </td>
                        <td>{getStatusBadge(camp.status)}</td>
                        <td>
                          <span className="fw-semibold">{camp.sentCount || 0}</span>
                        </td>
                        <td>
                          <div>{camp.deliveredCount || 0}</div>
                          <small className="text-muted">{deliveredPct}%</small>
                        </td>
                        <td>
                          <div>{camp.readCount || 0}</div>
                          <small className="text-success fw-semibold">{readPct}%</small>
                        </td>
                        <td className="text-muted small">
                          {new Date(camp.createdAt).toLocaleDateString()}
                        </td>
                        <td className="text-end pe-4">
                          <div className="btn-group btn-group-sm">
                            {camp.status === 'DRAFT' && (
                              <button
                                className="btn btn-outline-success"
                                title="Launch Campaign"
                                onClick={() => launchMutation.mutate(camp.id)}
                                disabled={launchMutation.isPending}
                              >
                                <i className="fas fa-play"></i> Launch
                              </button>
                            )}
                            {camp.status === 'PROCESSING' && (
                              <button
                                className="btn btn-outline-warning"
                                title="Pause Campaign"
                                onClick={() => pauseMutation.mutate(camp.id)}
                                disabled={pauseMutation.isPending}
                              >
                                <i className="fas fa-pause"></i> Pause
                              </button>
                            )}
                            {camp.status === 'PAUSED' && (
                              <button
                                className="btn btn-outline-primary"
                                title="Resume Campaign"
                                onClick={() => resumeMutation.mutate(camp.id)}
                                disabled={resumeMutation.isPending}
                              >
                                <i className="fas fa-play"></i> Resume
                              </button>
                            )}
                            {['PROCESSING', 'PAUSED', 'SCHEDULED'].includes(camp.status) && (
                              <button
                                className="btn btn-outline-danger"
                                title="Cancel Campaign"
                                onClick={() => {
                                  if (confirm('Are you sure you want to cancel this campaign?')) {
                                    cancelMutation.mutate(camp.id);
                                  }
                                }}
                                disabled={cancelMutation.isPending}
                              >
                                <i className="fas fa-stop"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Campaign Builder Modal */}
      <CampaignBuilderModal
        show={showBuilder}
        onClose={() => setShowBuilder(false)}
      />
    </div>
  );
}

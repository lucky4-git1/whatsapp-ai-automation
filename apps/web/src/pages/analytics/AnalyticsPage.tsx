import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, contactApi } from '../../lib/api';
import toast from 'react-hot-toast';

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('30d');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['analytics-overview', dateRange],
    queryFn: () => analyticsApi.getOverview(),
  });

  const stats = data?.data?.data;

  const handleExportCSV = async () => {
    try {
      const res = await contactApi.export();
      const csvData = (res.data?.data as any)?.csv || '';
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `analytics-contacts-report-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Analytics & Contact Report exported to CSV');
    } catch {
      toast.error('Failed to export CSV report');
    }
  };

  return (
    <div>
      {/* Top Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1 fw-bold">Analytics & Performance</h2>
          <p className="text-muted mb-0">
            Real-time delivery rates, Meta Cloud API statuses, and customer engagement metrics.
          </p>
        </div>
        <div className="d-flex gap-2">
          <select
            className="form-select form-select-sm"
            style={{ width: '150px' }}
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
          <button className="btn btn-outline-secondary btn-sm" onClick={() => refetch()}>
            <i className="fas fa-sync-alt me-1"></i> Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleExportCSV}>
            <i className="fas fa-file-export me-1"></i> Export CSV
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading database analytics...</span>
          </div>
        </div>
      ) : !stats ? (
        <div className="alert alert-warning">No analytics data available.</div>
      ) : (
        <>
          {/* Top 4 KPI Cards */}
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="text-muted small fw-semibold text-uppercase">Total Audience</div>
                  <h3 className="fw-bold mt-2 mb-0">{stats.contacts?.total || 0}</h3>
                  <div className="small text-success mt-1">
                    <i className="fas fa-check-circle me-1"></i>
                    {stats.contacts?.optedIn || 0} Opted-In Recipients
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="text-muted small fw-semibold text-uppercase">Total Dispatched</div>
                  <h3 className="fw-bold mt-2 mb-0 text-primary">
                    {stats.deliveryFunnel?.accepted || stats.messages?.total || 0}
                  </h3>
                  <div className="small text-muted mt-1">
                    Meta Cloud API Accepted
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="text-muted small fw-semibold text-uppercase">Delivery Rate</div>
                  <h3 className="fw-bold mt-2 mb-0 text-success">
                    {stats.rates?.deliveryRate || 0}%
                  </h3>
                  <div className="small text-muted mt-1">
                    {stats.deliveryFunnel?.delivered || 0} Handsets Delivered
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="text-muted small fw-semibold text-uppercase">Read Rate</div>
                  <h3 className="fw-bold mt-2 mb-0 text-info">
                    {stats.rates?.readRate || 0}%
                  </h3>
                  <div className="small text-muted mt-1">
                    {stats.deliveryFunnel?.read || 0} Handsets Read
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Funnel & Conversion */}
          <div className="row g-4 mb-4">
            <div className="col-lg-8">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white py-3">
                  <h6 className="fw-bold mb-0">Delivery Funnel (Real Database Webhook Data)</h6>
                </div>
                <div className="card-body">
                  <p className="small text-muted mb-4">
                    Stage-by-stage progression from API message acceptance to customer receipt and read event.
                  </p>

                  <div className="mb-4">
                    <div className="d-flex justify-content-between mb-1 small">
                      <span className="fw-semibold">1. API Accepted</span>
                      <span>{stats.deliveryFunnel?.accepted || 0} msgs (100%)</span>
                    </div>
                    <div className="progress" style={{ height: '14px' }}>
                      <div className="progress-bar bg-secondary" style={{ width: '100%' }}></div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="d-flex justify-content-between mb-1 small">
                      <span className="fw-semibold">2. Dispatched / Sent</span>
                      <span>{stats.deliveryFunnel?.sent || 0} msgs</span>
                    </div>
                    <div className="progress" style={{ height: '14px' }}>
                      <div
                        className="progress-bar bg-primary"
                        style={{
                          width: `${
                            stats.deliveryFunnel?.accepted
                              ? (stats.deliveryFunnel.sent / stats.deliveryFunnel.accepted) * 100
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="d-flex justify-content-between mb-1 small">
                      <span className="fw-semibold">3. Delivered to Handset</span>
                      <span>{stats.deliveryFunnel?.delivered || 0} msgs ({stats.rates?.deliveryRate}%)</span>
                    </div>
                    <div className="progress" style={{ height: '14px' }}>
                      <div
                        className="progress-bar bg-success"
                        style={{
                          width: `${
                            stats.deliveryFunnel?.accepted
                              ? (stats.deliveryFunnel.delivered / stats.deliveryFunnel.accepted) * 100
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="d-flex justify-content-between mb-1 small">
                      <span className="fw-semibold">4. Read by Customer</span>
                      <span>{stats.deliveryFunnel?.read || 0} msgs ({stats.rates?.readRate}%)</span>
                    </div>
                    <div className="progress" style={{ height: '14px' }}>
                      <div
                        className="progress-bar bg-info"
                        style={{
                          width: `${
                            stats.deliveryFunnel?.accepted
                              ? (stats.deliveryFunnel.read / stats.deliveryFunnel.accepted) * 100
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="d-flex justify-content-between mb-1 small">
                      <span className="fw-semibold text-danger">5. Delivery Failures</span>
                      <span className="text-danger">{stats.deliveryFunnel?.failed || 0} msgs ({stats.rates?.failureRate}%)</span>
                    </div>
                    <div className="progress" style={{ height: '14px' }}>
                      <div
                        className="progress-bar bg-danger"
                        style={{
                          width: `${
                            stats.deliveryFunnel?.accepted
                              ? (stats.deliveryFunnel.failed / stats.deliveryFunnel.accepted) * 100
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Conversation & Lead Conversion */}
            <div className="col-lg-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white py-3">
                  <h6 className="fw-bold mb-0">Engagement & Replies</h6>
                </div>
                <div className="card-body">
                  <div className="p-3 bg-light rounded mb-3 text-center">
                    <div className="text-muted small">Customer Inbound Replies</div>
                    <h2 className="fw-bold text-success my-2">{stats.messages?.inbound || 0}</h2>
                    <small className="text-muted">Direct replies received in Shared Inbox</small>
                  </div>

                  <div className="list-group list-group-flush small">
                    <div className="list-group-item d-flex justify-content-between px-0 py-2">
                      <span className="text-muted">Total Conversations:</span>
                      <span className="fw-bold">{stats.conversations?.total || 0}</span>
                    </div>
                    <div className="list-group-item d-flex justify-content-between px-0 py-2">
                      <span className="text-muted">Active Unresolved:</span>
                      <span className="badge bg-warning text-dark">{stats.conversations?.active || 0}</span>
                    </div>
                    <div className="list-group-item d-flex justify-content-between px-0 py-2">
                      <span className="text-muted">Resolved / Closed:</span>
                      <span className="badge bg-success">{stats.conversations?.resolved || 0}</span>
                    </div>
                    <div className="list-group-item d-flex justify-content-between px-0 py-2">
                      <span className="text-muted">Broadcast Campaigns:</span>
                      <span className="fw-bold">{stats.campaigns?.total || 0}</span>
                    </div>
                    <div className="list-group-item d-flex justify-content-between px-0 py-2">
                      <span className="text-muted">Opt-Out / Suppression Rate:</span>
                      <span className="fw-bold text-secondary">
                        {stats.contacts?.total > 0
                          ? ((stats.contacts.optedOut / stats.contacts.total) * 100).toFixed(1)
                          : '0.0'}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowApi } from '../../lib/api';
import toast from 'react-hot-toast';

interface WorkflowItem {
  id: string;
  name: string;
  description?: string | null;
  triggerType: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    nodes: number;
    executions: number;
  };
}

export default function WorkflowsPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    triggerType: 'MESSAGE_RECEIVED',
    isActive: true,
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => workflowApi.list(),
  });

  const workflows: WorkflowItem[] = response?.data?.data?.workflows || [];

  const createMutation = useMutation({
    mutationFn: (data: typeof newWorkflow) => workflowApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Workflow created successfully');
      setShowCreateModal(false);
      setNewWorkflow({
        name: '',
        description: '',
        triggerType: 'MESSAGE_RECEIVED',
        isActive: true,
      });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to create workflow');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => workflowApi.toggle(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      const active = res.data?.data?.isActive;
      toast.success(active ? 'Workflow activated' : 'Workflow paused');
    },
    onError: () => {
      toast.error('Failed to toggle workflow status');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workflowApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Workflow deleted');
    },
    onError: () => {
      toast.error('Failed to delete workflow');
    },
  });

  const executeMutation = useMutation({
    mutationFn: (id: string) => workflowApi.execute(id, { triggerSource: 'manual_test' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Workflow test run triggered successfully!');
    },
    onError: () => {
      toast.error('Failed to trigger workflow execution');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkflow.name.trim()) {
      toast.error('Workflow name is required');
      return;
    }
    createMutation.mutate(newWorkflow);
  };

  const getTriggerBadge = (type: string) => {
    switch (type) {
      case 'MESSAGE_RECEIVED':
        return <span className="badge bg-primary"><i className="fas fa-comment-dots me-1"></i> Incoming Message</span>;
      case 'KEYWORD':
        return <span className="badge bg-info text-dark"><i className="fas fa-hashtag me-1"></i> Keyword Match</span>;
      case 'TAG_ADDED':
        return <span className="badge bg-warning text-dark"><i className="fas fa-tag me-1"></i> Tag Added</span>;
      case 'LEAD_CREATED':
        return <span className="badge bg-success"><i className="fas fa-user-plus me-1"></i> Lead Created</span>;
      default:
        return <span className="badge bg-secondary">{type}</span>;
    }
  };

  const totalActive = workflows.filter((w) => w.isActive).length;
  const totalExecutions = workflows.reduce((acc, w) => acc + (w._count?.executions || 0), 0);

  return (
    <div>
      {/* Top Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="mb-1">Workflows & Automations</h2>
          <p className="text-muted mb-0">
            Build event-driven rules, intelligent auto-replies, and WhatsApp routing pipelines.
          </p>
        </div>
        <div>
          <button
            className="btn btn-primary d-inline-flex align-items-center"
            onClick={() => setShowCreateModal(true)}
          >
            <i className="fas fa-plus me-2"></i>
            Create Workflow
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <div className="card shadow-sm border-0">
            <div className="card-body d-flex align-items-center">
              <div className="rounded-circle bg-primary bg-opacity-10 p-3 me-3 text-primary">
                <i className="fas fa-project-diagram fa-2x"></i>
              </div>
              <div>
                <h6 className="text-muted mb-1 small text-uppercase fw-semibold">Total Workflows</h6>
                <h3 className="mb-0 fw-bold">{workflows.length}</h3>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card shadow-sm border-0">
            <div className="card-body d-flex align-items-center">
              <div className="rounded-circle bg-success bg-opacity-10 p-3 me-3 text-success">
                <i className="fas fa-bolt fa-2x"></i>
              </div>
              <div>
                <h6 className="text-muted mb-1 small text-uppercase fw-semibold">Active Automations</h6>
                <h3 className="mb-0 fw-bold">{totalActive}</h3>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card shadow-sm border-0">
            <div className="card-body d-flex align-items-center">
              <div className="rounded-circle bg-info bg-opacity-10 p-3 me-3 text-info">
                <i className="fas fa-history fa-2x"></i>
              </div>
              <div>
                <h6 className="text-muted mb-1 small text-uppercase fw-semibold">Total Executions</h6>
                <h3 className="mb-0 fw-bold">{totalExecutions}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow List */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
          <h5 className="mb-0 fw-semibold">Configured Automations</h5>
          <span className="text-muted small">{workflows.length} rules defined</span>
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading workflows...</span>
              </div>
            </div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-5 px-3">
              <i className="fas fa-robot fa-3x text-muted mb-3 opacity-50"></i>
              <h5>No workflows configured yet</h5>
              <p className="text-muted mb-4 max-w-md mx-auto">
                Automate your customer conversations with smart triggers, AI responses, and routing.
              </p>
              <button
                className="btn btn-outline-primary"
                onClick={() => setShowCreateModal(true)}
              >
                <i className="fas fa-plus me-1"></i> Add Your First Workflow
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Workflow Name</th>
                    <th>Trigger</th>
                    <th>Status</th>
                    <th>Nodes</th>
                    <th>Executions</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workflows.map((wf) => (
                    <tr key={wf.id}>
                      <td>
                        <div className="fw-semibold text-dark">{wf.name}</div>
                        {wf.description && (
                          <small className="text-muted text-truncate d-inline-block" style={{ maxWidth: '300px' }}>
                            {wf.description}
                          </small>
                        )}
                      </td>
                      <td>{getTriggerBadge(wf.triggerType)}</td>
                      <td>
                        <button
                          type="button"
                          className={`btn btn-sm ${wf.isActive ? 'btn-success' : 'btn-outline-secondary'}`}
                          onClick={() => toggleMutation.mutate(wf.id)}
                          disabled={toggleMutation.isPending}
                          title="Click to toggle status"
                        >
                          <i className={`fas fa-${wf.isActive ? 'check-circle' : 'pause-circle'} me-1`}></i>
                          {wf.isActive ? 'Active' : 'Paused'}
                        </button>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          <i className="fas fa-cubes me-1 text-muted"></i>
                          {wf._count?.nodes || 0} steps
                        </span>
                      </td>
                      <td>
                        <span className="text-muted small">
                          <i className="fas fa-play me-1 text-primary"></i>
                          {wf._count?.executions || 0} runs
                        </span>
                      </td>
                      <td className="text-end">
                        <button
                          className="btn btn-sm btn-outline-primary me-2"
                          title="Execute manual test run"
                          onClick={() => executeMutation.mutate(wf.id)}
                          disabled={executeMutation.isPending}
                        >
                          <i className="fas fa-bolt me-1"></i> Test Run
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          title="Delete workflow"
                          onClick={() => {
                            if (confirm(`Delete workflow "${wf.name}"?`)) {
                              deleteMutation.mutate(wf.id);
                            }
                          }}
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Workflow Modal */}
      {showCreateModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  <i className="fas fa-plus-circle text-primary me-2"></i>
                  Create Automation Workflow
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCreateModal(false)}
                ></button>
              </div>
              <form onSubmit={handleCreateSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Workflow Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. VIP Customer Welcome, Sales Inquiry Responder"
                      value={newWorkflow.name}
                      onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Trigger Event</label>
                    <select
                      className="form-select"
                      value={newWorkflow.triggerType}
                      onChange={(e) => setNewWorkflow({ ...newWorkflow, triggerType: e.target.value })}
                    >
                      <option value="MESSAGE_RECEIVED">Incoming WhatsApp Message</option>
                      <option value="KEYWORD">Keyword / Intent Match</option>
                      <option value="TAG_ADDED">Contact Tag Added</option>
                      <option value="LEAD_CREATED">New Contact Registered</option>
                    </select>
                    <small className="form-text text-muted">
                      Determines what event starts this automated pipeline.
                    </small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Description (optional)</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="Explain what this automation does..."
                      value={newWorkflow.description}
                      onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                    />
                  </div>

                  <div className="form-check form-switch mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="workflowActiveSwitch"
                      checked={newWorkflow.isActive}
                      onChange={(e) => setNewWorkflow({ ...newWorkflow, isActive: e.target.checked })}
                    />
                    <label className="form-check-label fw-semibold" htmlFor="workflowActiveSwitch">
                      Activate immediately after creation
                    </label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Creating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check me-1"></i> Create Workflow
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

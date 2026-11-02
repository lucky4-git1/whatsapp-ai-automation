import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { whatsappApi, contactApi, campaignApi } from '../../lib/api';
import toast from 'react-hot-toast';

interface CampaignBuilderModalProps {
  show: boolean;
  onClose: () => void;
}

export default function CampaignBuilderModal({ show, onClose }: CampaignBuilderModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'MARKETING',
    accountId: '',
    targetAudience: 'ALL_OPTED_IN',
    tagFilter: '',
    templateId: '',
    variableMappings: {} as Record<string, string>,
    scheduleType: 'IMMEDIATE',
    scheduledAt: '',
    testPhone: '+919876543210',
  });

  const [testSent, setTestSent] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Queries
  const { data: accountsData } = useQuery({
    queryKey: ['whatsapp-accounts'],
    queryFn: () => whatsappApi.listAccounts(),
    enabled: show,
  });
  const accounts = accountsData?.data?.data?.accounts || [];

  const { data: contactsData } = useQuery({
    queryKey: ['contacts-summary'],
    queryFn: () => contactApi.list({ limit: 100 }),
    enabled: show,
  });
  const contacts = (contactsData?.data?.data as any[]) || [];
  const optedInCount = contacts.filter((c: any) => c.consentStatus === 'OPTED_IN').length;

  const { data: templatesData } = useQuery({
    queryKey: ['whatsapp-templates', formData.accountId],
    queryFn: () => whatsappApi.getTemplates(formData.accountId),
    enabled: show && !!formData.accountId,
  });
  const templates = (templatesData?.data?.data?.templates as any[]) || [];

  const selectedTemplate = templates.find((t: any) => t.id === formData.templateId || t.name === formData.templateId);

  // Mutations
  const createCampaignMutation = useMutation({
    mutationFn: (payload: any) => campaignApi.create(payload),
    onSuccess: (res: any) => {
      const campaignId = res.data?.data?.campaign?.id;
      if (formData.scheduleType === 'IMMEDIATE' && campaignId) {
        campaignApi.launch(campaignId).catch(() => {});
      }
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success(
        formData.scheduleType === 'IMMEDIATE'
          ? 'Campaign created and queued for immediate delivery!'
          : 'Campaign scheduled successfully!'
      );
      handleClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create campaign');
    },
  });

  const handleClose = () => {
    setStep(1);
    setTestSent(false);
    onClose();
  };

  const handleSendTestMessage = async () => {
    if (!formData.accountId) {
      toast.error('Select a WhatsApp Account first');
      return;
    }
    if (!formData.testPhone) {
      toast.error('Enter a valid test phone number');
      return;
    }

    try {
      setIsSendingTest(true);
      await whatsappApi.testMessage(formData.accountId, formData.testPhone, `[TEST CAMPAIGN PREVIEW] ${formData.name}`);
      setTestSent(true);
      toast.success(`Test message dispatched to ${formData.testPhone}`);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to dispatch test message');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleLaunch = () => {
    createCampaignMutation.mutate({
      name: formData.name,
      description: formData.description,
      type: formData.type,
      templateId: formData.templateId || selectedTemplate?.name || 'standard_notice',
      metadata: {
        accountId: formData.accountId,
        targetAudience: formData.targetAudience,
        tagFilter: formData.tagFilter,
        variableMappings: formData.variableMappings,
        scheduleType: formData.scheduleType,
        scheduledAt: formData.scheduledAt,
      },
      scheduledAt: formData.scheduleType === 'SCHEDULED' ? formData.scheduledAt : undefined,
    });
  };

  if (!show) return null;

  const totalSteps = 10;
  const stepTitles = [
    'Campaign Details',
    'WhatsApp Account',
    'Audience Definition',
    'Contact Segmentation',
    'Template Selection',
    'Dynamic Variable Mapping',
    'Interactive Preview',
    'Send Test Verification',
    'Schedule & Throttling',
    'Launch Confirmation',
  ];

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)', zIndex: 1060 }}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content shadow-lg border-0">
          {/* Header */}
          <div className="modal-header bg-dark text-white py-3">
            <div>
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-success px-2 py-1">Step {step} of {totalSteps}</span>
                <h5 className="modal-title mb-0 fw-semibold text-white">
                  {stepTitles[step - 1]}
                </h5>
              </div>
              <small className="text-white-50">
                10-Step Enterprise WhatsApp Broadcast Campaign Engine
              </small>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={handleClose}
              disabled={createCampaignMutation.isPending}
            />
          </div>

          {/* Progress Tracker */}
          <div className="progress rounded-0" style={{ height: '4px' }}>
            <div
              className="progress-bar bg-success"
              style={{ width: `${(step / totalSteps) * 100}%`, transition: 'width 0.3s ease' }}
            />
          </div>

          {/* Body */}
          <div className="modal-body p-4" style={{ minHeight: '380px' }}>
            {/* STEP 1: Campaign Details */}
            {step === 1 && (
              <div>
                <h6 className="fw-bold mb-3">1. Name and Campaign Classification</h6>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Campaign Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Diwali Flash Sale - VIP Members"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Description / Internal Goal</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Describe target objectives, ROI goals, or campaign context"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Campaign Purpose</label>
                  <select
                    className="form-select"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="MARKETING">Marketing & Promotion (Opted-in only)</option>
                    <option value="UTILITY">Utility / Order Updates</option>
                    <option value="AUTHENTICATION">Authentication / OTP Service</option>
                  </select>
                  <small className="text-muted d-block mt-1">
                    Meta requires explicit opt-in consent for all Marketing messages.
                  </small>
                </div>
              </div>
            )}

            {/* STEP 2: WhatsApp Account */}
            {step === 2 && (
              <div>
                <h6 className="fw-bold mb-3">2. Select Outbound WhatsApp Cloud Account</h6>
                <p className="text-muted small">
                  Choose the registered Business Phone Number through which messages will be broadcasted.
                </p>
                {accounts.length === 0 ? (
                  <div className="alert alert-warning">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    No WhatsApp Business Account connected. Go to WhatsApp Connections to connect your account.
                  </div>
                ) : (
                  <div className="list-group">
                    {accounts.map((acc: any) => (
                      <label
                        key={acc.id}
                        className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center cursor-pointer ${
                          formData.accountId === acc.id ? 'active' : ''
                        }`}
                        onClick={() => setFormData({ ...formData, accountId: acc.id })}
                      >
                        <div>
                          <div className="fw-bold">{acc.name}</div>
                          <small className={formData.accountId === acc.id ? 'text-white-50' : 'text-muted'}>
                            {acc.displayPhoneNumber || acc.phoneNumber} • WABA ID: {acc.wabaId || 'WABA-Cloud'}
                          </small>
                        </div>
                        <span className="badge bg-success">
                          {acc.status || 'CONNECTED'}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Audience Selection */}
            {step === 3 && (
              <div>
                <h6 className="fw-bold mb-3">3. Target Audience Selection</h6>
                <div className="card mb-3 border-light bg-light">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <div className="text-muted small">Total Contacts in Workspace</div>
                        <h4 className="fw-bold mb-0 text-dark">{contacts.length}</h4>
                      </div>
                      <div className="text-end">
                        <div className="text-muted small">Opted-In Contacts (Eligible)</div>
                        <h4 className="fw-bold mb-0 text-success">{optedInCount}</h4>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-check mb-3">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="targetAudience"
                    id="aud1"
                    checked={formData.targetAudience === 'ALL_OPTED_IN'}
                    onChange={() => setFormData({ ...formData, targetAudience: 'ALL_OPTED_IN' })}
                  />
                  <label className="form-check-label" htmlFor="aud1">
                    <strong>All Opted-In Contacts ({optedInCount} recipients)</strong>
                    <div className="text-muted small">Compliant with Meta anti-spam policies. Only contacts with active opt-in consent will receive this message.</div>
                  </label>
                </div>

                <div className="form-check mb-3">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="targetAudience"
                    id="aud2"
                    checked={formData.targetAudience === 'TAG_FILTER'}
                    onChange={() => setFormData({ ...formData, targetAudience: 'TAG_FILTER' })}
                  />
                  <label className="form-check-label" htmlFor="aud2">
                    <strong>Segment by Contact Tag</strong>
                    <div className="text-muted small">Target a specific tagged cohort (e.g. VIP, Hyderabad, Lead).</div>
                  </label>
                </div>
              </div>
            )}

            {/* STEP 4: Contact Segmentation */}
            {step === 4 && (
              <div>
                <h6 className="fw-bold mb-3">4. Cohort Segmentation Rules</h6>
                {formData.targetAudience === 'TAG_FILTER' ? (
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Target Tag Identifier</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. vip, retail-lead, hyderabad"
                      value={formData.tagFilter}
                      onChange={(e) => setFormData({ ...formData, tagFilter: e.target.value })}
                    />
                    <small className="text-muted d-block mt-1">
                      Only contacts possessing this tag and with OPTED_IN consent will be included.
                    </small>
                  </div>
                ) : (
                  <div className="alert alert-info">
                    <i className="fas fa-info-circle me-2"></i>
                    Broad audience selected: broadcasting to all <strong>{optedInCount}</strong> opted-in customers in this workspace.
                  </div>
                )}
                <div className="p-3 bg-light rounded border">
                  <div className="fw-semibold small text-secondary mb-1">Safety Rule Enforcement:</div>
                  <ul className="small text-muted mb-0 ps-3">
                    <li>Unsubscribed/Opted-out contacts are automatically suppressed.</li>
                    <li>Numbers without valid E.164 country codes are discarded.</li>
                    <li>Rate limiting enforces a maximum of 80 messages per second per WABA.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* STEP 5: Template Selection */}
            {step === 5 && (
              <div>
                <h6 className="fw-bold mb-3">5. Select Meta-Approved Template</h6>
                <p className="text-muted small">
                  Outbound broadcasts must utilize pre-approved WhatsApp message templates.
                </p>
                {templates.length === 0 ? (
                  <div className="alert alert-warning">
                    No approved templates found for this account. Ensure you have synced templates or created them in Meta Business Manager.
                  </div>
                ) : (
                  <div className="list-group">
                    {templates.map((tpl: any) => (
                      <label
                        key={tpl.id || tpl.name}
                        className={`list-group-item list-group-item-action cursor-pointer ${
                          formData.templateId === (tpl.id || tpl.name) ? 'active' : ''
                        }`}
                        onClick={() => setFormData({ ...formData, templateId: tpl.id || tpl.name })}
                      >
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="fw-bold">{tpl.name}</span>
                          <span className="badge bg-success">{tpl.status || 'APPROVED'}</span>
                        </div>
                        <div className="small text-truncate" style={{ maxWidth: '600px' }}>
                          {tpl.components?.find((c: any) => c.type === 'BODY')?.text || tpl.name}
                        </div>
                        <div className="text-muted small mt-1">
                          Category: {tpl.category || 'MARKETING'} • Language: {tpl.language || 'en_US'}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STEP 6: Variable Mapping */}
            {step === 6 && (
              <div>
                <h6 className="fw-bold mb-3">6. Dynamic Variable Mapping</h6>
                <p className="text-muted small">
                  Map placeholders like {'{{1}}'}, {'{{2}}'} to recipient contact fields.
                </p>
                <div className="table-responsive">
                  <table className="table table-bordered table-sm align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Variable</th>
                        <th>Mapped Contact Attribute</th>
                        <th>Sample Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><code>{`{{1}}`}</code></td>
                        <td>
                          <select
                            className="form-select form-select-sm"
                            value={formData.variableMappings['1'] || 'firstName'}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                variableMappings: { ...formData.variableMappings, '1': e.target.value },
                              })
                            }
                          >
                            <option value="firstName">Contact First Name</option>
                            <option value="fullName">Full Name</option>
                            <option value="phoneNumber">Phone Number</option>
                            <option value="custom">Custom Text</option>
                          </select>
                        </td>
                        <td className="text-muted">Alex</td>
                      </tr>
                      <tr>
                        <td><code>{`{{2}}`}</code></td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="e.g. 20% OFF or Workspace Name"
                            value={formData.variableMappings['2'] || 'EXCLUSIVE20'}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                variableMappings: { ...formData.variableMappings, '2': e.target.value },
                              })
                            }
                          />
                        </td>
                        <td className="text-muted">EXCLUSIVE20</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* STEP 7: Interactive Preview */}
            {step === 7 && (
              <div>
                <h6 className="fw-bold mb-3">7. Interactive WhatsApp Bubble Preview</h6>
                <div className="d-flex justify-content-center p-4 bg-light rounded">
                  <div
                    className="p-3 shadow-sm rounded"
                    style={{
                      maxWidth: '380px',
                      backgroundColor: '#E7FFDB',
                      border: '1px solid #c7ebb8',
                      position: 'relative',
                    }}
                  >
                    <div className="small fw-bold text-success mb-1">
                      <i className="fab fa-whatsapp me-1"></i> Official Business Account
                    </div>
                    <div className="text-dark small" style={{ whiteSpace: 'pre-line' }}>
                      {selectedTemplate?.components?.find((c: any) => c.type === 'BODY')?.text
                        ? selectedTemplate.components
                            .find((c: any) => c.type === 'BODY')
                            .text.replace('{{1}}', 'Alex')
                            .replace('{{2}}', formData.variableMappings['2'] || 'EXCLUSIVE20')
                        : `Hello Alex! Special offer for you: Use code ${
                            formData.variableMappings['2'] || 'EXCLUSIVE20'
                          } on WhatsApp AI Automation.`}
                    </div>
                    <div className="text-end text-muted mt-2" style={{ fontSize: '10px' }}>
                      12:45 PM • <i className="fas fa-check-double text-primary"></i>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 8: Test Message Verification */}
            {step === 8 && (
              <div>
                <h6 className="fw-bold mb-3">8. Send Test Message (Quality Assurance)</h6>
                <p className="text-muted small">
                  Verify how your broadcast appears on a real handset before blasting the full cohort.
                </p>
                <div className="input-group mb-3">
                  <span className="input-group-text"><i className="fas fa-mobile-alt"></i></span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="+919876543210 (E.164 phone)"
                    value={formData.testPhone}
                    onChange={(e) => setFormData({ ...formData, testPhone: e.target.value })}
                  />
                  <button
                    className="btn btn-outline-success"
                    onClick={handleSendTestMessage}
                    disabled={isSendingTest}
                  >
                    {isSendingTest ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" /> Sending...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane me-1"></i> Send Test Message
                      </>
                    )}
                  </button>
                </div>
                {testSent && (
                  <div className="alert alert-success d-flex align-items-center">
                    <i className="fas fa-check-circle fa-2x me-3"></i>
                    <div>
                      <strong>Test message dispatched!</strong>
                      <div className="small">Check the handset connected to {formData.testPhone} to inspect formatting.</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 9: Schedule & Throttling */}
            {step === 9 && (
              <div>
                <h6 className="fw-bold mb-3">9. Delivery Schedule & Throttling</h6>
                <div className="form-check mb-3">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="schedule"
                    id="sch1"
                    checked={formData.scheduleType === 'IMMEDIATE'}
                    onChange={() => setFormData({ ...formData, scheduleType: 'IMMEDIATE' })}
                  />
                  <label className="form-check-label fw-semibold" htmlFor="sch1">
                    Send Immediately
                    <div className="text-muted small fw-normal">Launch job into BullMQ queue right upon confirmation.</div>
                  </label>
                </div>

                <div className="form-check mb-3">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="schedule"
                    id="sch2"
                    checked={formData.scheduleType === 'SCHEDULED'}
                    onChange={() => setFormData({ ...formData, scheduleType: 'SCHEDULED' })}
                  />
                  <label className="form-check-label fw-semibold" htmlFor="sch2">
                    Schedule for Future Time
                    <div className="text-muted small fw-normal">Select a future date and time in your local timezone.</div>
                  </label>
                </div>

                {formData.scheduleType === 'SCHEDULED' && (
                  <div className="ms-4 mb-3">
                    <label className="form-label small fw-semibold">Launch Timestamp</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={formData.scheduledAt}
                      onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                    />
                  </div>
                )}
              </div>
            )}

            {/* STEP 10: Launch Confirmation */}
            {step === 10 && (
              <div>
                <h6 className="fw-bold mb-3">10. Final Campaign Review & Launch Confirmation</h6>
                <div className="card bg-light border-0 mb-3">
                  <div className="card-body">
                    <dl className="row mb-0 small">
                      <dt className="col-sm-4 text-muted">Campaign Name:</dt>
                      <dd className="col-sm-8 fw-semibold">{formData.name || 'Untitled Campaign'}</dd>

                      <dt className="col-sm-4 text-muted">Type / Category:</dt>
                      <dd className="col-sm-8">{formData.type}</dd>

                      <dt className="col-sm-4 text-muted">WhatsApp Account:</dt>
                      <dd className="col-sm-8">{accounts.find((a: any) => a.id === formData.accountId)?.name || 'Default'}</dd>

                      <dt className="col-sm-4 text-muted">Audience Segment:</dt>
                      <dd className="col-sm-8">{formData.targetAudience === 'TAG_FILTER' ? `Tag: ${formData.tagFilter}` : `All Opted-In (${optedInCount} contacts)`}</dd>

                      <dt className="col-sm-4 text-muted">Template Name:</dt>
                      <dd className="col-sm-8"><code>{formData.templateId || 'standard_template'}</code></dd>

                      <dt className="col-sm-4 text-muted">Dispatch Mode:</dt>
                      <dd className="col-sm-8">
                        {formData.scheduleType === 'IMMEDIATE' ? (
                          <span className="badge bg-success">Immediate Dispatch</span>
                        ) : (
                          <span className="badge bg-info">{formData.scheduledAt || 'Scheduled'}</span>
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>

                <div className="alert alert-warning small">
                  <i className="fas fa-shield-alt me-2"></i>
                  By launching this campaign, you acknowledge that all targeted recipients have provided verified WhatsApp opt-in consent in adherence with Meta WhatsApp Business Cloud API Terms of Service.
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer bg-light py-2">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleClose}
              disabled={createCampaignMutation.isPending}
            >
              Cancel
            </button>
            {step > 1 && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep(step - 1)}
                disabled={createCampaignMutation.isPending}
              >
                <i className="fas fa-chevron-left me-1"></i> Back
              </button>
            )}
            {step < totalSteps ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (step === 1 && !formData.name.trim()) {
                    toast.error('Campaign name is required');
                    return;
                  }
                  if (step === 2 && !formData.accountId && accounts.length > 0) {
                    setFormData({ ...formData, accountId: accounts[0].id });
                  }
                  setStep(step + 1);
                }}
              >
                Next <i className="fas fa-chevron-right ms-1"></i>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-success fw-semibold"
                onClick={handleLaunch}
                disabled={createCampaignMutation.isPending}
              >
                {createCampaignMutation.isPending ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" /> Launching...
                  </>
                ) : (
                  <>
                    <i className="fas fa-rocket me-2"></i> Confirm & Launch Campaign
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

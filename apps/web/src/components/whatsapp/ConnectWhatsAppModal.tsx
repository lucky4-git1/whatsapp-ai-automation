import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { whatsappApi } from '../../lib/api';
import toast from 'react-hot-toast';

interface ConnectWhatsAppModalProps {
  show: boolean;
  onClose: () => void;
}

export default function ConnectWhatsAppModal({
  show,
  onClose,
}: ConnectWhatsAppModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    businessAccountId: '',
    phoneNumberId: '',
    phoneNumber: '',
    accessToken: '',
    webhookSecret: '',
  });

  const connectMutation = useMutation({
    mutationFn: (data: any) => whatsappApi.connectAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
      toast.success('WhatsApp account connected successfully');
      setFormData({
        name: '',
        businessAccountId: '',
        phoneNumberId: '',
        phoneNumber: '',
        accessToken: '',
        webhookSecret: '',
      });
      onClose();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error?.message || 'Failed to connect account'
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    connectMutation.mutate(formData);
  };

  if (!show) return null;

  return (
    <>
      <div
        className="modal-backdrop fade show"
        onClick={onClose}
        style={{ zIndex: 1040 }}
      ></div>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        style={{ zIndex: 1050 }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h5 className="modal-title">Connect WhatsApp Account</h5>
                <small className="text-muted">
                  Enter your WhatsApp Business API credentials
                </small>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
              ></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="alert alert-info">
                  <i className="fas fa-info-circle me-2"></i>
                  <strong>Need help?</strong> Check our{' '}
                  <a href="/docs/whatsapp-setup.md" target="_blank">
                    WhatsApp setup guide
                  </a>{' '}
                  for detailed instructions.
                </div>

                <div className="mb-3">
                  <label htmlFor="name" className="form-label">
                    Account Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="My WhatsApp Business"
                    required
                  />
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="businessAccountId" className="form-label">
                      Business Account ID <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control font-monospace"
                      id="businessAccountId"
                      value={formData.businessAccountId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          businessAccountId: e.target.value,
                        })
                      }
                      placeholder="123456789012345"
                      required
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label htmlFor="phoneNumberId" className="form-label">
                      Phone Number ID <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control font-monospace"
                      id="phoneNumberId"
                      value={formData.phoneNumberId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          phoneNumberId: e.target.value,
                        })
                      }
                      placeholder="123456789012345"
                      required
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="phoneNumber" className="form-label">
                    Phone Number <span className="text-danger">*</span>
                  </label>
                  <input
                    type="tel"
                    className="form-control"
                    id="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, phoneNumber: e.target.value })
                    }
                    placeholder="1234567890"
                    required
                  />
                  <small className="text-muted">
                    Your WhatsApp Business phone number
                  </small>
                </div>

                <div className="mb-3">
                  <label htmlFor="accessToken" className="form-label">
                    Access Token <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="form-control font-monospace"
                    id="accessToken"
                    rows={3}
                    value={formData.accessToken}
                    onChange={(e) =>
                      setFormData({ ...formData, accessToken: e.target.value })
                    }
                    placeholder="Your permanent access token from Meta"
                    required
                  ></textarea>
                  <small className="text-muted">
                    Generate a permanent token from your Meta app
                  </small>
                </div>

                <div className="mb-3">
                  <label htmlFor="webhookSecret" className="form-label">
                    Webhook Secret
                  </label>
                  <input
                    type="text"
                    className="form-control font-monospace"
                    id="webhookSecret"
                    value={formData.webhookSecret}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        webhookSecret: e.target.value,
                      })
                    }
                    placeholder="Your webhook verification token"
                  />
                  <small className="text-muted">
                    The verify token you used when setting up webhooks
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  disabled={connectMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={connectMutation.isPending}
                >
                  {connectMutation.isPending ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                      ></span>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <i className="fab fa-whatsapp me-2"></i>
                      Connect Account
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

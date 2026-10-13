import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

export default function WorkspaceSettingsPage() {
  const { user } = useAuthStore();
  const currentWorkspaceName =
    user?.memberships?.[0]?.workspaceName || 'Primary Workspace';

  const [settings, setSettings] = useState({
    workspaceName: currentWorkspaceName,
    timezone: 'UTC+05:30 (Asia/Kolkata)',
    defaultLanguage: 'en',
    aiEnabled: true,
    aiProvider: 'openai',
    aiModel: 'gpt-4-turbo-preview',
    aiTemperature: 0.7,
    autoAssign: true,
    humanTakeoverKeyword: 'HUMAN',
    webhookUrl: `${window.location.origin}/api/v1/whatsapp/webhook`,
  });

  const [saving, setSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Workspace preferences saved successfully');
    }, 600);
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="mb-1">Workspace Settings</h2>
        <p className="text-muted mb-0">
          Configure AI responses, general defaults, and automation rules
        </p>
      </div>

      <form onSubmit={handleSave}>
        <div className="row g-4">
          {/* General Information */}
          <div className="col-lg-6">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-header bg-white py-3 border-bottom">
                <h5 className="card-title mb-0">
                  <i className="fas fa-building text-primary me-2"></i>
                  General Configuration
                </h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label fw-medium">Workspace Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={settings.workspaceName}
                    onChange={(e) =>
                      setSettings({ ...settings, workspaceName: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-medium">Default Timezone</label>
                  <select
                    className="form-select"
                    value={settings.timezone}
                    onChange={(e) =>
                      setSettings({ ...settings, timezone: e.target.value })
                    }
                  >
                    <option value="UTC+05:30 (Asia/Kolkata)">
                      UTC+05:30 (India Standard Time)
                    </option>
                    <option value="UTC+00:00 (GMT)">UTC+00:00 (GMT / London)</option>
                    <option value="UTC-05:00 (EST)">UTC-05:00 (New York / EST)</option>
                    <option value="UTC-08:00 (PST)">UTC-08:00 (Los Angeles / PST)</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-medium">Default Language</label>
                  <select
                    className="form-select"
                    value={settings.defaultLanguage}
                    onChange={(e) =>
                      setSettings({ ...settings, defaultLanguage: e.target.value })
                    }
                  >
                    <option value="en">English</option>
                    <option value="te">Telugu</option>
                    <option value="hi">Hindi</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-medium">Webhook Endpoint URL</label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control bg-light font-monospace small"
                      value={settings.webhookUrl}
                      readOnly
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => {
                        navigator.clipboard.writeText(settings.webhookUrl);
                        toast.success('Webhook URL copied to clipboard');
                      }}
                    >
                      <i className="fas fa-copy"></i>
                    </button>
                  </div>
                  <small className="text-muted">
                    Configure this URL in Meta Developer Portal for Webhooks
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* AI Settings */}
          <div className="col-lg-6">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-header bg-white py-3 border-bottom">
                <h5 className="card-title mb-0">
                  <i className="fas fa-robot text-success me-2"></i>
                  AI & Automation Engine
                </h5>
              </div>
              <div className="card-body">
                <div className="form-check form-switch mb-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="aiEnabledSwitch"
                    checked={settings.aiEnabled}
                    onChange={(e) =>
                      setSettings({ ...settings, aiEnabled: e.target.checked })
                    }
                  />
                  <label className="form-check-label fw-medium" htmlFor="aiEnabledSwitch">
                    Enable Autonomous AI Responses
                  </label>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="form-label fw-medium">AI Provider</label>
                    <select
                      className="form-select"
                      value={settings.aiProvider}
                      onChange={(e) =>
                        setSettings({ ...settings, aiProvider: e.target.value })
                      }
                      disabled={!settings.aiEnabled}
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic (Claude)</option>
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-medium">Model</label>
                    <select
                      className="form-select"
                      value={settings.aiModel}
                      onChange={(e) =>
                        setSettings({ ...settings, aiModel: e.target.value })
                      }
                      disabled={!settings.aiEnabled}
                    >
                      <option value="gpt-4-turbo-preview">GPT-4 Turbo</option>
                      <option value="gpt-4o">GPT-4o (Omni)</option>
                      <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                      <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                    </select>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="d-flex justify-content-between">
                    <label className="form-label fw-medium">
                      Creativity & Temperature: {settings.aiTemperature}
                    </label>
                    <small className="text-muted">
                      {settings.aiTemperature < 0.4
                        ? 'Deterministic'
                        : settings.aiTemperature > 0.7
                        ? 'Creative'
                        : 'Balanced'}
                    </small>
                  </div>
                  <input
                    type="range"
                    className="form-range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.aiTemperature}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        aiTemperature: parseFloat(e.target.value),
                      })
                    }
                    disabled={!settings.aiEnabled}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-medium">
                    Human Takeover Trigger Keyword
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={settings.humanTakeoverKeyword}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        humanTakeoverKeyword: e.target.value,
                      })
                    }
                  />
                  <small className="text-muted">
                    When a customer types this keyword, AI pauses and routes to agent
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 d-flex justify-content-end">
          <button
            type="submit"
            className="btn btn-primary px-4 py-2"
            disabled={saving}
          >
            {saving ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                ></span>
                Saving...
              </>
            ) : (
              <>
                <i className="fas fa-save me-2"></i>
                Save Workspace Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiApi } from '../../lib/api';
import toast from 'react-hot-toast';

export default function AIStudioPage() {
  const [activeTab, setActiveTab] = useState<'copy' | 'rewrite' | 'translate' | 'lead-scoring'>('copy');

  // Copy Generation State
  const [copyForm, setCopyForm] = useState({
    objective: 'Flash sale announcement with 20% discount',
    product: 'WhatsApp Business AI Automation Platform',
    tone: 'persuasive',
    language: 'English',
  });
  const [generatedCopy, setGeneratedCopy] = useState<string>('');

  // Rewrite State
  const [rewriteInput, setRewriteInput] = useState('Hey we have a sale check it out now or miss it');
  const [rewriteTone, setRewriteTone] = useState('professional');
  const [rewriteResult, setRewriteResult] = useState<string>('');

  // Translate State
  const [translateInput, setTranslateInput] = useState('Hello! Your order has been confirmed and is out for delivery.');
  const [translateTarget, setTranslateTarget] = useState('Telugu');
  const [translateResult, setTranslateResult] = useState<string>('');

  // Mutations
  const generateCopyMutation = useMutation({
    mutationFn: (data: any) => aiApi.generateCopy(data),
    onSuccess: (res: any) => {
      setGeneratedCopy(res.data?.data?.copy || res.data?.data?.variants?.[0]?.text || '');
      toast.success('Promotional copy generated');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to generate copy');
    },
  });

  const rewriteMutation = useMutation({
    mutationFn: (data: { text: string; tone: string }) => aiApi.rewrite(data.text, data.tone),
    onSuccess: (res: any) => {
      setRewriteResult(res.data?.data?.rewritten || '');
      toast.success('Message rewritten');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to rewrite message');
    },
  });

  const translateMutation = useMutation({
    mutationFn: (data: { text: string; targetLanguage: string }) =>
      aiApi.translateTelugu(data.text, data.targetLanguage),
    onSuccess: (res: any) => {
      setTranslateResult(res.data?.data?.translated || '');
      toast.success('Translated successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to translate');
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1 fw-bold">AI Studio & Assistant</h2>
          <p className="text-muted mb-0">
            Intelligent WhatsApp marketing copy generation, Telugu translation, and tone rewriting.
          </p>
        </div>
        <div>
          <span className="badge bg-success py-2 px-3">
            <i className="fas fa-brain me-1"></i> Gemini 1.5 Flash Copilot Active
          </span>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-pills mb-4 gap-2">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'copy' ? 'active bg-primary' : 'bg-white text-dark border'}`}
            onClick={() => setActiveTab('copy')}
          >
            <i className="fas fa-bullhorn me-2"></i> Promotional Copy Generator
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'rewrite' ? 'active bg-primary' : 'bg-white text-dark border'}`}
            onClick={() => setActiveTab('rewrite')}
          >
            <i className="fas fa-magic me-2"></i> Message Rewriter & Polisher
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'translate' ? 'active bg-primary' : 'bg-white text-dark border'}`}
            onClick={() => setActiveTab('translate')}
          >
            <i className="fas fa-language me-2"></i> Telugu & English Translation
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'lead-scoring' ? 'active bg-primary' : 'bg-white text-dark border'}`}
            onClick={() => setActiveTab('lead-scoring')}
          >
            <i className="fas fa-filter me-2"></i> Intent & Lead Scoring Rules
          </button>
        </li>
      </ul>

      {/* Tab 1: Copy Generator */}
      {activeTab === 'copy' && (
        <div className="row g-4">
          <div className="col-lg-6">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-header bg-white py-3">
                <h6 className="fw-bold mb-0">Campaign Copy Parameters</h6>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold small">Product or Service Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={copyForm.product}
                    onChange={(e) => setCopyForm({ ...copyForm, product: e.target.value })}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold small">Campaign Objective</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="e.g. Announce a 24-hour flash sale for premium customers"
                    value={copyForm.objective}
                    onChange={(e) => setCopyForm({ ...copyForm, objective: e.target.value })}
                  />
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Tone</label>
                    <select
                      className="form-select"
                      value={copyForm.tone}
                      onChange={(e) => setCopyForm({ ...copyForm, tone: e.target.value })}
                    >
                      <option value="persuasive">Persuasive & Engaging</option>
                      <option value="urgent">High Urgency / FOMO</option>
                      <option value="friendly">Friendly & Warm</option>
                      <option value="professional">Professional / B2B</option>
                      <option value="exclusive">Exclusive / VIP Club</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Target Language</label>
                    <select
                      className="form-select"
                      value={copyForm.language}
                      onChange={(e) => setCopyForm({ ...copyForm, language: e.target.value })}
                    >
                      <option value="English">English</option>
                      <option value="Telugu">Telugu (తెలుగు)</option>
                      <option value="Hinglish">Hinglish</option>
                    </select>
                  </div>
                </div>

                <button
                  className="btn btn-primary w-100"
                  onClick={() => generateCopyMutation.mutate(copyForm)}
                  disabled={generateCopyMutation.isPending}
                >
                  {generateCopyMutation.isPending ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" /> Generating with AI...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-sparkles me-2"></i> Generate WhatsApp Broadcast Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <h6 className="fw-bold mb-0">Generated Output & Preview</h6>
                {generatedCopy && (
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => copyToClipboard(generatedCopy)}
                  >
                    <i className="fas fa-copy me-1"></i> Copy
                  </button>
                )}
              </div>
              <div className="card-body d-flex flex-column justify-content-center align-items-center p-4 bg-light">
                {generatedCopy ? (
                  <div
                    className="p-3 shadow-sm rounded bg-white w-100"
                    style={{
                      borderLeft: '4px solid #25D366',
                      whiteSpace: 'pre-line',
                      maxHeight: '350px',
                      overflowY: 'auto',
                    }}
                  >
                    {generatedCopy}
                  </div>
                ) : (
                  <div className="text-center text-muted py-5">
                    <i className="fas fa-comment-dots fa-3x mb-3 text-secondary"></i>
                    <p className="mb-0">Fill in the parameters and click Generate to produce WhatsApp-tailored copy.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Rewriter */}
      {activeTab === 'rewrite' && (
        <div className="row g-4">
          <div className="col-lg-6">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-white py-3">
                <h6 className="fw-bold mb-0">Original Draft Message</h6>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Input Text</label>
                  <textarea
                    className="form-control"
                    rows={5}
                    value={rewriteInput}
                    onChange={(e) => setRewriteInput(e.target.value)}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Target Tone</label>
                  <div className="d-flex flex-wrap gap-2">
                    {['professional', 'persuasive', 'urgent', 'friendly', 'concise'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={`btn btn-sm text-capitalize ${
                          rewriteTone === t ? 'btn-primary' : 'btn-outline-secondary'
                        }`}
                        onClick={() => setRewriteTone(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={() => rewriteMutation.mutate({ text: rewriteInput, tone: rewriteTone })}
                  disabled={rewriteMutation.isPending}
                >
                  {rewriteMutation.isPending ? 'Polishing...' : 'Polish & Rewrite'}
                </button>
              </div>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <h6 className="fw-bold mb-0">Polished Result</h6>
                {rewriteResult && (
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => copyToClipboard(rewriteResult)}
                  >
                    <i className="fas fa-copy me-1"></i> Copy
                  </button>
                )}
              </div>
              <div className="card-body">
                {rewriteResult ? (
                  <div className="p-3 rounded bg-light border text-dark" style={{ whiteSpace: 'pre-line' }}>
                    {rewriteResult}
                  </div>
                ) : (
                  <div className="text-center text-muted py-5">
                    Click Polish & Rewrite to see AI-enhanced text.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Telugu Translation */}
      {activeTab === 'translate' && (
        <div className="row g-4">
          <div className="col-lg-6">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-white py-3">
                <h6 className="fw-bold mb-0">Source Text</h6>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Input Message</label>
                  <textarea
                    className="form-control"
                    rows={5}
                    value={translateInput}
                    onChange={(e) => setTranslateInput(e.target.value)}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Target Language</label>
                  <select
                    className="form-select"
                    value={translateTarget}
                    onChange={(e) => setTranslateTarget(e.target.value)}
                  >
                    <option value="Telugu">Telugu (తెలుగు)</option>
                    <option value="English">English</option>
                  </select>
                </div>

                <button
                  className="btn btn-success"
                  onClick={() =>
                    translateMutation.mutate({ text: translateInput, targetLanguage: translateTarget })
                  }
                  disabled={translateMutation.isPending}
                >
                  {translateMutation.isPending ? 'Translating...' : 'Translate Message'}
                </button>
              </div>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <h6 className="fw-bold mb-0">Translated Message</h6>
                {translateResult && (
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => copyToClipboard(translateResult)}
                  >
                    <i className="fas fa-copy me-1"></i> Copy
                  </button>
                )}
              </div>
              <div className="card-body">
                {translateResult ? (
                  <div
                    className="p-3 rounded bg-light border text-dark fs-5"
                    style={{ whiteSpace: 'pre-line', fontFamily: 'system-ui, sans-serif' }}
                  >
                    {translateResult}
                  </div>
                ) : (
                  <div className="text-center text-muted py-5">
                    Click Translate Message to preview verified regional copy.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Intent & Lead Scoring Rules */}
      {activeTab === 'lead-scoring' && (
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3">
            <h6 className="fw-bold mb-0">Real-Time Inbound Intent Classifier</h6>
          </div>
          <div className="card-body">
            <p className="text-muted small">
              When inbound messages arrive via Meta Webhooks, AI automatically analyzes the customer intention and assigns conversational labels and priority scores:
            </p>
            <div className="table-responsive">
              <table className="table table-bordered align-middle">
                <thead className="table-light small text-uppercase">
                  <tr>
                    <th>Intent Category</th>
                    <th>Sample Keywords / Utterance</th>
                    <th>Classification Score</th>
                    <th>Automated Action</th>
                  </tr>
                </thead>
                <tbody className="small">
                  <tr>
                    <td><span className="badge bg-success">PURCHASE_INTENT</span></td>
                    <td>&quot;What is the pricing?&quot;, &quot;I want to buy&quot;, &quot;Demo details&quot;</td>
                    <td><strong>90-100 (High Priority)</strong></td>
                    <td>Assign to Sales Rep & Trigger VIP Template</td>
                  </tr>
                  <tr>
                    <td><span className="badge bg-info text-dark">SUPPORT_REQUEST</span></td>
                    <td>&quot;Issue with order&quot;, &quot;Not working&quot;, &quot;Login error&quot;</td>
                    <td><strong>75 (Medium)</strong></td>
                    <td>Route to Tier 1 Support Agent</td>
                  </tr>
                  <tr>
                    <td><span className="badge bg-danger">OPT_OUT</span></td>
                    <td>&quot;STOP&quot;, &quot;Unsubscribe&quot;, &quot;No more messages&quot;</td>
                    <td><strong>100 (Immediate Action)</strong></td>
                    <td>Update consent to <code>OPTED_OUT</code> & suppress further broadcasts</td>
                  </tr>
                  <tr>
                    <td><span className="badge bg-secondary">GENERAL_QUERY</span></td>
                    <td>&quot;Hi&quot;, &quot;Hello&quot;, &quot;Address please&quot;</td>
                    <td><strong>50 (Standard)</strong></td>
                    <td>AI Copilot generates 1-click suggested response</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

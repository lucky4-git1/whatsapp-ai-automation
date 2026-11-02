import { useState } from 'react';
import { contactApi } from '../../lib/api';
import toast from 'react-hot-toast';

interface ImportWizardModalProps {
  isOpen?: boolean;
  show?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ImportWizardModal({ isOpen, show, onClose, onSuccess }: ImportWizardModalProps) {
  const visible = isOpen ?? show ?? false;
  const [step, setStep] = useState(1);
  const [rawText, setRawText] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState({
    phoneNumber: '',
    name: '',
    email: '',
    tags: '',
  });
  const [consentStatus, setConsentStatus] = useState('EXPLICIT_OPT_IN');
  const [validationStats, setValidationStats] = useState({
    validCount: 0,
    invalidCount: 0,
    indianCount: 0,
    sampleValid: [] as any[],
  });
  const [importReport, setImportReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Step 1 & 2: Parse CSV file or pasted text
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      parseCSV(content);
    };
    reader.readAsText(file);
  };

  const parseCSV = (csvText: string) => {
    setRawText(csvText);
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      toast.error('CSV must have a header row and at least 1 record');
      return;
    }

    const detectedHeaders = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    setHeaders(detectedHeaders);

    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      const rowObj: Record<string, string> = {};
      detectedHeaders.forEach((h, idx) => {
        rowObj[h] = values[idx] || '';
      });
      return rowObj;
    });

    setParsedRows(rows);

    // Auto-map common headers
    const autoMap = {
      phoneNumber: detectedHeaders.find(h => /phone|mobile|whatsapp|number|tel/i.test(h)) || detectedHeaders[0],
      name: detectedHeaders.find(h => /name|full.*name|contact/i.test(h)) || '',
      email: detectedHeaders.find(h => /email|mail/i.test(h)) || '',
      tags: detectedHeaders.find(h => /tag|category|segment/i.test(h)) || '',
    };
    setMapping(autoMap);
    setStep(2); // Advance to Mapping
  };

  const handlePastedText = () => {
    if (!rawText.trim()) {
      toast.error('Please enter or paste CSV text');
      return;
    }
    parseCSV(rawText);
  };

  // Step 4 & 5: Validate phone numbers with E.164 & Indian format (+91)
  const processValidation = () => {
    let valid = 0;
    let invalid = 0;
    let indian = 0;
    const samples: any[] = [];

    parsedRows.forEach((row) => {
      let phone = (row[mapping.phoneNumber] || '').replace(/[\s\-\(\)]/g, '');
      if (phone.length === 10 && /^[6-9]\d{9}$/.test(phone)) {
        phone = `+91${phone}`;
        indian++;
      } else if (!phone.startsWith('+') && phone.length > 0) {
        phone = `+${phone}`;
      }

      const isValid = /^\+\d{10,15}$/.test(phone);
      if (isValid) {
        valid++;
        if (samples.length < 5) {
          samples.push({
            originalPhone: row[mapping.phoneNumber],
            normalizedPhone: phone,
            name: mapping.name ? row[mapping.name] : 'N/A',
            email: mapping.email ? row[mapping.email] : 'N/A',
          });
        }
      } else {
        invalid++;
      }
    });

    setValidationStats({
      validCount: valid,
      invalidCount: invalid,
      indianCount: indian,
      sampleValid: samples,
    });
    setStep(4);
  };

  // Step 8: Execute Import
  const executeImport = async () => {
    setLoading(true);
    try {
      const contactsToImport = parsedRows.map(row => {
        let phone = (row[mapping.phoneNumber] || '').replace(/[\s\-\(\)]/g, '');
        if (phone.length === 10 && /^[6-9]\d{9}$/.test(phone)) {
          phone = `+91${phone}`;
        } else if (!phone.startsWith('+') && phone.length > 0) {
          phone = `+${phone}`;
        }

        const tagList = mapping.tags && row[mapping.tags]
          ? row[mapping.tags].split(';').map((t: string) => t.trim()).filter(Boolean)
          : ['CSV-Import'];

        return {
          phoneNumber: phone,
          name: mapping.name ? row[mapping.name] : undefined,
          email: mapping.email ? row[mapping.email] : undefined,
          tags: tagList,
          consentStatus,
        };
      });

      const res = await contactApi.import(contactsToImport);
      setImportReport(res.data?.data);
      setStep(9); // Done
      toast.success('Contacts imported successfully!');
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg">
          {/* Header */}
          <div className="modal-header bg-dark text-white py-3">
            <div>
              <h5 className="modal-title fw-bold mb-0">
                <i className="fas fa-file-import text-success me-2"></i>
                Guided Contact Import Wizard
              </h5>
              <small className="text-white-50">Enterprise CRM Onboarding • 9-Step Verification</small>
            </div>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Close"></button>
          </div>

          {/* Stepper Indicator */}
          <div className="bg-light px-4 py-2 border-bottom d-flex align-items-center justify-content-between small">
            <span className={`fw-bold ${step === 1 ? 'text-primary' : 'text-muted'}`}>1. Upload</span>
            <i className="fas fa-chevron-right text-muted mx-1"></i>
            <span className={`fw-bold ${step === 2 ? 'text-primary' : 'text-muted'}`}>2. Map</span>
            <i className="fas fa-chevron-right text-muted mx-1"></i>
            <span className={`fw-bold ${step === 3 ? 'text-primary' : 'text-muted'}`}>3. Preview</span>
            <i className="fas fa-chevron-right text-muted mx-1"></i>
            <span className={`fw-bold ${step === 4 ? 'text-primary' : 'text-muted'}`}>4. Validate</span>
            <i className="fas fa-chevron-right text-muted mx-1"></i>
            <span className={`fw-bold ${step === 7 ? 'text-primary' : 'text-muted'}`}>5. Consent</span>
            <i className="fas fa-chevron-right text-muted mx-1"></i>
            <span className={`fw-bold ${step === 9 ? 'text-success' : 'text-muted'}`}>6. Summary</span>
          </div>

          {/* Modal Body */}
          <div className="modal-body p-4" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
            {/* Step 1: Upload File or Paste */}
            {step === 1 && (
              <div>
                <h6 className="fw-bold mb-3">Step 1: Select CSV or XLSX Source File</h6>
                <div className="border border-2 border-dashed rounded-3 p-4 text-center bg-light mb-3">
                  <i className="fas fa-cloud-upload-alt fa-3x text-success mb-3"></i>
                  <h5>Choose a file or drag & drop here</h5>
                  <p className="text-muted small">Supports .csv and text-delimited files up to 50,000 records</p>
                  <input
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    className="form-control w-75 mx-auto"
                    onChange={handleFileUpload}
                  />
                </div>

                <div className="text-center my-3 text-muted">— OR PASTE RAW CSV TEXT —</div>

                <textarea
                  className="form-control font-monospace small"
                  rows={4}
                  placeholder="phone,name,email,tags&#10;+919876543210,David Warner,david@cricket.in,VIP;Lead&#10;9849012345,Ananya Rao,ananya@apex.com,Enterprise"
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                />

                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm mt-2"
                  onClick={() => {
                    setRawText("phone,name,email,tags\n+919876543210,David Warner,david@cricket.in,VIP;Lead\n9849012345,Ananya Rao,ananya@apex.com,Enterprise\n+15552345678,Sarah Connor,sarah@cyber.com,Pilot");
                  }}
                >
                  ⚡ Fill Sample CSV Data
                </button>
              </div>
            )}

            {/* Step 2: Map Fields */}
            {step === 2 && (
              <div>
                <h6 className="fw-bold mb-2">Step 2: Detect Columns & Map Fields</h6>
                <p className="text-muted small mb-3">Found {headers.length} columns and {parsedRows.length} records. Map each to your CRM contact properties.</p>

                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-medium text-danger">Phone Number * (Required)</label>
                    <select
                      className="form-select"
                      value={mapping.phoneNumber}
                      onChange={(e) => setMapping({ ...mapping, phoneNumber: e.target.value })}
                    >
                      {headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <small className="text-muted">Auto-normalized to E.164 international format</small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-medium">Contact Full Name</label>
                    <select
                      className="form-select"
                      value={mapping.name}
                      onChange={(e) => setMapping({ ...mapping, name: e.target.value })}
                    >
                      <option value="">(None / Skip)</option>
                      {headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-medium">Email Address</label>
                    <select
                      className="form-select"
                      value={mapping.email}
                      onChange={(e) => setMapping({ ...mapping, email: e.target.value })}
                    >
                      <option value="">(None / Skip)</option>
                      {headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-medium">Tags (separated by semicolon)</label>
                    <select
                      className="form-select"
                      value={mapping.tags}
                      onChange={(e) => setMapping({ ...mapping, tags: e.target.value })}
                    >
                      <option value="">(None / Default: CSV-Import)</option>
                      {headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Preview Data */}
            {step === 3 && (
              <div>
                <h6 className="fw-bold mb-2">Step 3: Preview First 5 Mapped Records</h6>
                <div className="table-responsive border rounded mb-3">
                  <table className="table table-sm table-striped mb-0 small">
                    <thead className="table-light">
                      <tr>
                        <th>#</th>
                        <th>Raw Phone</th>
                        <th>Mapped Name</th>
                        <th>Mapped Email</th>
                        <th>Tags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 5).map((row, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td className="fw-bold">{row[mapping.phoneNumber]}</td>
                          <td>{mapping.name ? row[mapping.name] : '—'}</td>
                          <td>{mapping.email ? row[mapping.email] : '—'}</td>
                          <td><span className="badge bg-secondary">{mapping.tags ? row[mapping.tags] : 'CSV-Import'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Step 4: Validation & Normalization */}
            {step === 4 && (
              <div>
                <h6 className="fw-bold mb-3">Step 4 & 5: E.164 Phone Normalization & Duplicates</h6>
                <div className="row g-3 mb-3">
                  <div className="col-md-4">
                    <div className="card bg-success bg-opacity-10 border-success p-3 text-center">
                      <div className="text-success fw-bold fs-4">{validationStats.validCount}</div>
                      <small className="text-muted">Valid E.164 Numbers</small>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card bg-info bg-opacity-10 border-info p-3 text-center">
                      <div className="text-info fw-bold fs-4">{validationStats.indianCount}</div>
                      <small className="text-muted">Indian Format (+91 Added)</small>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card bg-warning bg-opacity-10 border-warning p-3 text-center">
                      <div className="text-warning fw-bold fs-4">{validationStats.invalidCount}</div>
                      <small className="text-muted">Invalid (Will Skip)</small>
                    </div>
                  </div>
                </div>

                <div className="border rounded p-3 bg-light">
                  <h6 className="small fw-bold mb-2">Sample Normalization Table:</h6>
                  <ul className="list-unstyled mb-0 small">
                    {validationStats.sampleValid.map((s, i) => (
                      <li key={i} className="d-flex align-items-center mb-1">
                        <i className="fas fa-check-circle text-success me-2"></i>
                        <code>{s.originalPhone}</code>
                        <span className="mx-2">→</span>
                        <span className="fw-bold text-dark">{s.normalizedPhone}</span>
                        <span className="ms-2 text-muted">({s.name})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Step 7: Consent Eligibility */}
            {step === 7 && (
              <div>
                <h6 className="fw-bold mb-2">Step 7: Verify Consent Eligibility</h6>
                <div className="alert alert-warning small mb-3">
                  <i className="fas fa-shield-alt me-2"></i>
                  <strong>Meta Policy Warning:</strong> Broadcast templates and marketing campaigns may only be delivered to numbers that have explicitly opted in. Imported contacts must never receive unprompted spam.
                </div>

                <div className="mb-3">
                  <label className="form-label fw-medium">Consent Status for this Batch:</label>
                  <div className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="consentRadio"
                      id="optInRadio"
                      checked={consentStatus === 'EXPLICIT_OPT_IN'}
                      onChange={() => setConsentStatus('EXPLICIT_OPT_IN')}
                    />
                    <label className="form-check-label fw-medium" htmlFor="optInRadio">
                      <span className="badge bg-success me-2">Explicit Opt-In</span>
                      Contacts have checked an explicit WhatsApp opt-in box on our website or checkout form.
                    </label>
                  </div>

                  <div className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="consentRadio"
                      id="impliedRadio"
                      checked={consentStatus === 'IMPLIED_OPT_IN'}
                      onChange={() => setConsentStatus('IMPLIED_OPT_IN')}
                    />
                    <label className="form-check-label" htmlFor="impliedRadio">
                      <span className="badge bg-info me-2">Implied Opt-In</span>
                      Existing customers or active client inquiries (utility and customer support only).
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Step 9: Final Report */}
            {step === 9 && importReport && (
              <div className="text-center py-4">
                <i className="fas fa-check-circle fa-4x text-success mb-3"></i>
                <h4 className="fw-bold">Import Batch Completed!</h4>
                <p className="text-muted">Your contacts have been safely committed to PostgreSQL database.</p>

                <div className="row justify-content-center g-3 my-3">
                  <div className="col-auto">
                    <div className="p-3 border rounded bg-light">
                      <div className="fs-4 fw-bold text-success">{importReport.imported}</div>
                      <small className="text-muted">New Contacts</small>
                    </div>
                  </div>
                  <div className="col-auto">
                    <div className="p-3 border rounded bg-light">
                      <div className="fs-4 fw-bold text-primary">{importReport.duplicatesUpdated}</div>
                      <small className="text-muted">Duplicates Updated</small>
                    </div>
                  </div>
                  <div className="col-auto">
                    <div className="p-3 border rounded bg-light">
                      <div className="fs-4 fw-bold text-muted">{importReport.invalid}</div>
                      <small className="text-muted">Invalid Skipped</small>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="modal-footer bg-light py-2">
            {step === 1 && (
              <>
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handlePastedText}>
                  Continue to Mapping <i className="fas fa-arrow-right ms-1"></i>
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <button type="button" className="btn btn-outline-secondary" onClick={() => setStep(1)}>Back</button>
                <button type="button" className="btn btn-primary" onClick={() => setStep(3)}>
                  Preview Records <i className="fas fa-arrow-right ms-1"></i>
                </button>
              </>
            )}

            {step === 3 && (
              <>
                <button type="button" className="btn btn-outline-secondary" onClick={() => setStep(2)}>Back</button>
                <button type="button" className="btn btn-primary" onClick={processValidation}>
                  Validate Numbers & Normalize <i className="fas fa-arrow-right ms-1"></i>
                </button>
              </>
            )}

            {step === 4 && (
              <>
                <button type="button" className="btn btn-outline-secondary" onClick={() => setStep(3)}>Back</button>
                <button type="button" className="btn btn-primary" onClick={() => setStep(7)}>
                  Verify Consent Policy <i className="fas fa-arrow-right ms-1"></i>
                </button>
              </>
            )}

            {step === 7 && (
              <>
                <button type="button" className="btn btn-outline-secondary" onClick={() => setStep(4)}>Back</button>
                <button type="button" className="btn btn-success" onClick={executeImport} disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Importing Records...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-database me-2"></i>
                      Import {validationStats.validCount} Contacts
                    </>
                  )}
                </button>
              </>
            )}

            {step === 9 && (
              <button type="button" className="btn btn-primary px-4" onClick={onClose}>
                Done & View in Contacts CRM
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

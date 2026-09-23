import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { patientApi, type ExtractionSaveInput } from '../../api/patient';
import type { ExtractedItem, ExtractionIndicator, Report } from '../../types/auth';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png']);

function validateFile(file: File): string | null {
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(file.type) && !ALLOWED_EXTENSIONS.has(ext)) {
    return 'Unsupported file type. Please upload a PDF, JPG, JPEG or PNG file.';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'File exceeds the 10 MB limit.';
  }
  return null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fileTypeLabel(report: Report): string {
  if (report.fileType === 'application/pdf') return 'PDF';
  if (report.fileType === 'image/jpeg' || report.fileType === 'image/pjpeg') return 'JPG';
  if (report.fileType === 'image/png') return 'PNG';
  return report.fileType;
}

const STATUS_LABELS: Record<string, string> = {
  pending_review: 'Pending review',
  under_review: 'Under review',
  reviewed: 'Reviewed',
  rejected: 'Rejected',
};

function statusBadgeClass(status: string): string {
  if (status === 'reviewed') return 'badge badge-success';
  if (status === 'rejected') return 'badge badge-danger';
  if (status === 'under_review') return 'badge badge-info';
  return 'badge badge-pending';
}

const EXTRACTION_LABELS: Record<string, string> = {
  confirmed: 'Confirmed',
  pending_confirmation: 'Needs review',
  processing: 'Processing',
  failed: 'Extraction failed',
  none: 'Extraction pending',
};

function extractionBadgeClass(status: string): string {
  if (status === 'confirmed') return 'badge badge-success';
  if (status === 'failed') return 'badge badge-danger';
  if (status === 'pending_confirmation') return 'badge badge-pending';
  return 'badge badge-info';
}

const INDICATOR_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '—' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'low', label: 'Low' },
  { value: 'abnormal', label: 'Abnormal' },
];

interface DraftState {
  items: ExtractedItem[];
  reportDate: string;
  diagnoses: string;
  medicines: string;
  notes: string;
}

function makeItem(): ExtractedItem {
  return {
    id: `new-${Math.random().toString(36).slice(2)}`,
    testName: '',
    value: '',
    unit: '',
    reference: '',
    indicator: null,
  };
}

function splitComma(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function PatientReportsPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [selected, setSelected] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [saving, setSaving] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const editorBoxRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { reports } = await patientApi.getReports();
      setReports(reports);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load your reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openEditor = (report: Report) => {
    setDraft({
      items: report.extraction.items.map((item) => ({ ...item })),
      reportDate: report.extraction.reportDate ?? '',
      diagnoses: report.extraction.diagnoses.join(', '),
      medicines: report.extraction.medicines.join(', '),
      notes: report.extraction.notes ?? '',
    });
    setEditingId(report.id);
    setEditorError(null);
  };

  useEffect(() => {
    if (editingId) {
      editorBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [editingId]);

  const handleFileChange = (file: File | null) => {
    setSelected(file);
    setUploadError(null);
    setUploadSuccess(null);
  };

  const handleUpload = async () => {
    if (!selected) {
      setUploadError('Please choose a file to upload.');
      return;
    }
    const validationError = validateFile(selected);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setUploadError(null);
    setUploadSuccess(null);
    setUploading(true);
    setProgress(0);
    try {
      const { report, message } = await patientApi.uploadReport(selected, setProgress);
      setReports((prev) => [report, ...prev]);
      setSelected(null);
      setProgress(0);
      setUploadSuccess(message);
      if (report.extraction.status === 'pending_confirmation') {
        openEditor(report);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const updateItem = (id: string, patch: Partial<ExtractedItem>) => {
    setDraft((prev) =>
      prev ? { ...prev, items: prev.items.map((item) => (item.id === id ? { ...item, ...patch } : item)) } : prev,
    );
  };

  const setField = (field: keyof Omit<DraftState, 'items'>) => {
    return (value: string) => setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const buildPayload = (): ExtractionSaveInput => {
    const current = draft!;
    return {
      items: current.items
        .map((item) => ({
          id: item.id,
          testName: item.testName.trim(),
          value: item.value.trim(),
          unit: item.unit.trim(),
          reference: item.reference.trim(),
          indicator: item.indicator,
        }))
        .filter((item) => item.testName.length > 0),
      reportDate: current.reportDate.trim() || null,
      diagnoses: splitComma(current.diagnoses),
      medicines: splitComma(current.medicines),
      quality: null,
      notes: current.notes.trim() || null,
    };
  };

  const handleSaveDraft = async () => {
    if (!editingId || !draft) return;
    setSaving(true);
    setEditorError(null);
    try {
      const { report, message } = await patientApi.saveExtraction(editingId, buildPayload());
      setReports((prev) => prev.map((r) => (r.id === editingId ? report : r)));
      setUploadSuccess(message);
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : 'Could not save the draft.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    if (!editingId || !draft) return;
    setSaving(true);
    setEditorError(null);
    try {
      const saved = await patientApi.saveExtraction(editingId, buildPayload());
      const { report, message } = await patientApi.confirmExtraction(saved.report.id);
      setReports((prev) => prev.map((r) => (r.id === saved.report.id ? report : r)));
      setEditingId(null);
      setDraft(null);
      setUploadSuccess(message);
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : 'Could not confirm the report data.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="center-screen" role="status" aria-label="Loading reports">
        <div className="spinner" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <h1>Medical Reports</h1>
          <div className="alert alert-error">{loadError}</div>
          <button type="button" className="btn btn-primary btn-block" onClick={load}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const editingReport = editingId ? reports.find((r) => r.id === editingId) ?? null : null;
  const editingIsLowQuality = editingReport?.extraction.quality === 'low';

  return (
    <div className="auth-wrap">
      <div className="auth-card reports-card">
        <h1>Medical Reports</h1>
        <p className="muted">Upload PDF, JPG, JPEG or PNG reports (10 MB max).</p>

        <div className="upload-box">
          <label className="upload-label">
            <span>Choose a report file</span>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              disabled={uploading}
              data-testid="report-file"
            />
          </label>
          {selected && (
            <p className="muted upload-filename">
              {selected.name} ({formatFileSize(selected.size)})
            </p>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={uploading || !selected}
          >
            {uploading ? `Uploading… ${progress}%` : 'Upload report'}
          </button>
          {uploading && (
            <div className="progress-track" role="progressbar" aria-valuenow={progress}>
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
          )}
          {uploadError && <div className="alert alert-error">{uploadError}</div>}
          {uploadSuccess && <div className="alert alert-success">{uploadSuccess}</div>}
        </div>

        {editingReport && draft && (
          <div className="extract-editor" ref={editorBoxRef} data-testid="extract-editor">
            <h2 className="reports-title">Review &amp; confirm extracted data</h2>
            <p className="muted">
              {editingReport.originalFilename} — check every value. The AI health assistant only
              considers data you explicitly confirm. Nothing here is a diagnosis.
            </p>

            {editingIsLowQuality && (
              <div className="alert alert-error" role="status">
                {editingReport.extraction.notes ??
                  'We could not reliably read the values. Please upload a clearer scan or photo.'}
              </div>
            )}

            {editorError && <div className="alert alert-error">{editorError}</div>}

            <label>
              Report date
              <input
                type="date"
                value={draft.reportDate}
                onChange={(e) => setField('reportDate')(e.target.value)}
                data-testid="extract-date"
              />
            </label>

            <div className="extract-section-title">
              <span>Medical values</span>
            </div>
            <div className="extract-grid extract-grid-header">
              <span>Test</span>
              <span>Value</span>
              <span>Unit</span>
              <span>Reference range</span>
              <span>Flag</span>
              <span />
            </div>
            {draft.items.length === 0 && (
              <p className="muted">No values were read from this file yet.</p>
            )}
            <div className="extract-rows">
              {draft.items.map((item) => (
                <div className="extract-grid extract-grid-row" key={item.id}>
                  <input
                    type="text"
                    value={item.testName}
                    onChange={(e) => updateItem(item.id, { testName: e.target.value })}
                    placeholder="e.g. Glucose"
                    aria-label="Test name"
                    data-testid={`extract-name-${item.id}`}
                  />
                  <input
                    type="text"
                    value={item.value}
                    onChange={(e) => updateItem(item.id, { value: e.target.value })}
                    placeholder="e.g. 105"
                    aria-label="Value"
                  />
                  <input
                    type="text"
                    value={item.unit}
                    onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                    placeholder="e.g. mg/dL"
                    aria-label="Unit"
                  />
                  <input
                    type="text"
                    value={item.reference}
                    onChange={(e) => updateItem(item.id, { reference: e.target.value })}
                    placeholder="e.g. 70-99"
                    aria-label="Reference range"
                  />
                  <select
                    value={item.indicator ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      updateItem(item.id, { indicator: raw === '' ? null : (raw as ExtractionIndicator) });
                    }}
                    aria-label="Flag"
                  >
                    {INDICATOR_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-outline extract-remove"
                    onClick={() =>
                      setDraft((prev) =>
                        prev
                          ? { ...prev, items: prev.items.filter((it) => it.id !== item.id) }
                          : prev,
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-outline extract-add"
              onClick={() => setDraft((prev) => (prev ? { ...prev, items: [...prev.items, makeItem()] } : prev))}
            >
              + Add a value
            </button>

            <label>
              Diagnoses mentioned in the report
              <input
                type="text"
                value={draft.diagnoses}
                onChange={(e) => setField('diagnoses')(e.target.value)}
                placeholder="e.g. Hypertension, Iron deficiency (comma separated)"
                data-testid="extract-diagnoses"
              />
            </label>
            <label>
              Medicines mentioned in the report
              <input
                type="text"
                value={draft.medicines}
                onChange={(e) => setField('medicines')(e.target.value)}
                placeholder="e.g. Lisinopril, Metformin (comma separated)"
                data-testid="extract-medicines"
              />
            </label>
            <label>
              Notes
              <textarea
                value={draft.notes}
                onChange={(e) => setField('notes')(e.target.value)}
                rows={2}
                placeholder="Anything worth remembering about this report"
              />
            </label>

            {editingReport.extraction.text && (
              <details className="extract-text">
                <summary>View extracted text</summary>
                <pre>{editingReport.extraction.text}</pre>
              </details>
            )}

            <div className="extract-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleSaveDraft}
                disabled={saving}
                data-testid="extract-save"
              >
                {saving ? 'Saving…' : 'Save draft'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirm}
                disabled={saving}
                data-testid="extract-confirm"
              >
                {saving ? 'Confirming…' : 'Confirm & make available to AI'}
              </button>
            </div>
          </div>
        )}

        <h2 className="reports-title">Your reports</h2>
        {reports.length === 0 ? (
          <div className="alert alert-info" role="status">
            You don&apos;t have any reports yet. Upload your first report above.
          </div>
        ) : (
          <ul className="report-list">
            {reports.map((report) => (
              <li className="report-item report-item-column" key={report.id}>
                <div className="report-item-main">
                  <div className="report-meta">
                    <span className="report-name">{report.originalFilename}</span>
                    <span className="muted report-details">
                      {fileTypeLabel(report)} · {formatFileSize(report.fileSize)} ·{' '}
                      {formatDate(report.createdAt)}
                    </span>
                  </div>
                  <span className={statusBadgeClass(report.status)}>
                    {STATUS_LABELS[report.status] ?? report.status}
                  </span>
                  <span className={extractionBadgeClass(report.extraction.status)}>
                    {EXTRACTION_LABELS[report.extraction.status] ?? report.extraction.status}
                  </span>
                  <a
                    className="btn btn-outline report-view"
                    href={patientApi.reportFileUrl(report.id)}
                    target="_blank"
                    rel="noreferrer"
                    data-testid="report-view"
                  >
                    View
                  </a>
                  {report.extraction.status !== 'none' &&
                    report.extraction.status !== 'processing' && (
                      <button
                        type="button"
                        className="btn btn-outline report-view"
                        onClick={() => openEditor(report)}
                        disabled={editingId === report.id}
                        data-testid="report-review"
                      >
                        {editingId === report.id
                          ? 'Editing…'
                          : report.extraction.status === 'confirmed'
                            ? 'Review'
                            : 'Review & confirm'}
                      </button>
                    )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="auth-footer">
          <Link to="/patient" className="link">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
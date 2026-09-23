import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { patientApi } from '../../api/patient';
import type { MedicalHistory } from '../../types/auth';

const emptyForm = {
  conditions: '',
  allergies: '',
  medications: '',
  surgeries: '',
  familyHistory: '',
  notes: '',
};

function fillForm(history: MedicalHistory | null) {
  if (!history) return { ...emptyForm };
  return {
    conditions: history.conditions ?? '',
    allergies: history.allergies ?? '',
    medications: history.medications ?? '',
    surgeries: history.surgeries ?? '',
    familyHistory: history.familyHistory ?? '',
    notes: history.notes ?? '',
  };
}

export function PatientMedicalHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasHistory, setHasHistory] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { history } = await patientApi.getMedicalHistory();
      setHasHistory(history !== null);
      setForm(fillForm(history));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load your medical history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setField = (field: keyof typeof emptyForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSuccess(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const { history, message } = await patientApi.updateMedicalHistory(form);
      setHasHistory(true);
      setForm(fillForm(history));
      setSuccess(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save your medical history.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="center-screen" role="status" aria-label="Loading medical history">
        <div className="spinner" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <h1>Medical History</h1>
          <div className="alert alert-error">{loadError}</div>
          <button type="button" className="btn btn-primary btn-block" onClick={load}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Medical History</h1>
        <p className="muted">
          Record your conditions, allergies, medications, surgeries and other health notes.
        </p>
        {!hasHistory && (
          <div className="alert alert-info" role="status">
            You haven't recorded any medical history yet. Fill in the details below to create your
            record.
          </div>
        )}
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <label>
            Medical conditions
            <textarea
              value={form.conditions}
              onChange={(e) => setField('conditions', e.target.value)}
              rows={3}
              placeholder="e.g. Hypertension, type 2 diabetes"
              data-testid="history-conditions"
            />
          </label>
          <label>
            Allergies
            <textarea
              value={form.allergies}
              onChange={(e) => setField('allergies', e.target.value)}
              rows={3}
              placeholder="e.g. Penicillin, peanuts"
              data-testid="history-allergies"
            />
          </label>
          <label>
            Current medications
            <textarea
              value={form.medications}
              onChange={(e) => setField('medications', e.target.value)}
              rows={3}
              placeholder="e.g. Metformin 500 mg twice daily"
              data-testid="history-medications"
            />
          </label>
          <label>
            Previous surgeries / procedures
            <textarea
              value={form.surgeries}
              onChange={(e) => setField('surgeries', e.target.value)}
              rows={3}
              placeholder="e.g. Appendectomy (2019)"
              data-testid="history-surgeries"
            />
          </label>
          <label>
            Family medical history
            <textarea
              value={form.familyHistory}
              onChange={(e) => setField('familyHistory', e.target.value)}
              rows={3}
              placeholder="e.g. Heart disease in immediate family"
              data-testid="history-family"
            />
          </label>
          <label>
            Additional notes
            <textarea
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              rows={3}
              placeholder="Anything else your care team should know"
              data-testid="history-notes"
            />
          </label>
          <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
            {saving ? 'Saving…' : 'Save medical history'}
          </button>
        </form>
        <div className="auth-footer">
          <Link to="/patient" className="link">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
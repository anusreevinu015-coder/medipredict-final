import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { patientApi } from '../../api/patient';
import { useAuth } from '../../context/AuthContext';
import type { PatientProfile } from '../../types/auth';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: '',
  address: '',
};

function fillForm(profile: PatientProfile) {
  return {
    name: profile.name,
    email: profile.email,
    phone: profile.phone ?? '',
    dateOfBirth: profile.dateOfBirth ?? '',
    gender: profile.gender ?? '',
    address: profile.address ?? '',
  };
}

export function PatientProfilePage() {
  const { refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { profile } = await patientApi.getProfile();
      setForm(fillForm(profile));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load your profile.');
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
      const { profile, message } = await patientApi.updateProfile(form);
      setForm(fillForm(profile));
      setSuccess(message);
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save your profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="center-screen" role="status" aria-label="Loading profile">
        <div className="spinner" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <h1>Profile</h1>
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
        <h1>Your Profile</h1>
        <p className="muted">View and update your personal details.</p>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <label>
            Full name
            <input
              type="text"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              autoComplete="name"
              required
              minLength={2}
              data-testid="profile-name"
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
              autoComplete="email"
              required
              data-testid="profile-email"
            />
          </label>
          <label>
            Phone
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
              autoComplete="tel"
              data-testid="profile-phone"
            />
          </label>
          <label>
            Date of birth
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => setField('dateOfBirth', e.target.value)}
              data-testid="profile-dob"
            />
          </label>
          <label>
            Gender
            <select
              value={form.gender}
              onChange={(e) => setField('gender', e.target.value)}
              data-testid="profile-gender"
            >
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Address
            <textarea
              value={form.address}
              onChange={(e) => setField('address', e.target.value)}
              rows={2}
              data-testid="profile-address"
            />
          </label>
          <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
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
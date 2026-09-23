import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { feedbackApi } from '../../api/feedback';
import { appointmentApi } from '../../api/appointment';
import { hospitalApi } from '../../api/hospital';
import type { Appointment, AppointmentStatus, Feedback } from '../../types/auth';
import type { HospitalCatalogItem } from '../../types/hospital';

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange?: (rating: number) => void;
}) {
  return (
    <div className="star-rating" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          type="button"
          key={star}
          role="radio"
          aria-checked={star <= value}
          aria-label={`${star} star${star === 1 ? '' : 's'}`}
          className={`star-btn${star <= value ? ' star-btn-active' : ''}`}
          onClick={() => onChange?.(star)}
          disabled={!onChange}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function PatientFeedbackPage() {
  const [loading, setLoading] = useState(true);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [catalog, setCatalog] = useState<HospitalCatalogItem[]>([]);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [appointmentId, setAppointmentId] = useState('');
  const [hospitalId, setHospitalId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const loadFeedback = async () => {
    setLoading(true);
    setError(null);
    try {
      const { feedback } = await feedbackApi.getMyFeedback();
      setFeedbackList(feedback);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your feedback.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, []);

  useEffect(() => {
    let active = true;
    appointmentApi
      .getAppointments()
      .then(({ appointments }) => {
        if (active) setAppointments(appointments);
      })
      .catch(() => {
        /* Catalog still loads; appointments are optional for feedback. */
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    hospitalApi
      .catalog()
      .then(({ hospitals }) => {
        if (active) setCatalog(hospitals);
      })
      .catch(() => {
        /* Feedback can still be left using the catalog when it loads. */
      })
      .finally(() => {
        if (active) setLoadingCatalog(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedAppointment = useMemo(
    () => appointments.find((a) => a.id === appointmentId) ?? null,
    [appointments, appointmentId],
  );

  const handleSubmit = async () => {
    setFormError(null);
    setFormSuccess(null);

    if (rating < 1) {
      setFormError('Please choose a star rating (1–5).');
      return;
    }
    if (!comment.trim()) {
      setFormError('Please write a short comment before submitting.');
      return;
    }
    if (!appointmentId && !hospitalId) {
      setFormError('Please choose an appointment or a hospital to leave feedback for.');
      return;
    }

    setSubmitting(true);
    try {
      const { feedback, message } = await feedbackApi.submitFeedback({
        rating,
        comment: comment.trim(),
        appointmentId: appointmentId || null,
        hospitalId: appointmentId ? null : hospitalId || null,
      });
      setFeedbackList((prev) => [feedback, ...prev]);
      setRating(0);
      setComment('');
      setAppointmentId('');
      setHospitalId('');
      setFormSuccess(message);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not submit your feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card feedback-card">
        <h1>Feedback</h1>
        <p className="muted">
          Tell us about your experience with a hospital or appointment service. Your rating and
          comments help us improve care quality.
        </p>

        {error && <div className="alert alert-error">{error}</div>}
        {formError && <div className="alert alert-error">{formError}</div>}
        {formSuccess && <div className="alert alert-success">{formSuccess}</div>}

        <div className="booking-form">
          <label>
            Appointment (optional)
            <select
              value={appointmentId}
              onChange={(e) => {
                setAppointmentId(e.target.value);
                setHospitalId('');
              }}
              disabled={appointments.length === 0}
              data-testid="feedback-appointment"
            >
              <option value="">Select an appointment…</option>
              {appointments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.hospital?.name ?? 'Hospital'} · {a.doctor?.name ?? 'Doctor'} ·{' '}
                  {STATUS_LABELS[a.status]}
                </option>
              ))}
            </select>
          </label>

          <label>
            Hospital
            <select
              value={hospitalId}
              onChange={(e) => {
                setHospitalId(e.target.value);
                setAppointmentId('');
              }}
              disabled={selectedAppointment !== null || (!loadingCatalog && catalog.length === 0)}
              data-testid="feedback-hospital"
            >
              <option value="">
                {selectedAppointment
                  ? selectedAppointment.hospital?.name ?? 'Selected appointment'
                  : 'Select a hospital…'}
              </option>
              {!selectedAppointment &&
                catalog.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} — {h.city}
                  </option>
                ))}
            </select>
          </label>

          <label>
            Rating
            <StarRating value={rating} onChange={setRating} />
          </label>

          <label>
            Your feedback
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="What did you like, or what could be improved?"
              data-testid="feedback-comment"
            />
          </label>

          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={handleSubmit}
            disabled={submitting}
            data-testid="feedback-submit"
          >
            {submitting ? 'Submitting…' : 'Submit feedback'}
          </button>
        </div>

        <h2 className="reports-title">Your submitted feedback</h2>

        {loading && (
          <div className="center-screen" role="status" aria-label="Loading feedback">
            <div className="spinner" />
          </div>
        )}

        {!loading && feedbackList.length === 0 && (
          <div className="alert alert-info" role="status">
            You haven&apos;t submitted any feedback yet. Use the form above to share your experience.
          </div>
        )}

        {!loading && feedbackList.length > 0 && (
          <ul className="feedback-list">
            {feedbackList.map((feedback) => (
              <li className="feedback-item" key={feedback.id}>
                <div className="feedback-main">
                  <div className="feedback-subject">
                    <strong>{feedback.hospital?.name ?? 'Hospital'}</strong>
                    {feedback.doctor && <span className="muted">{feedback.doctor.name}</span>}
                  </div>
                  <div className="feedback-rating">
                    <StarRating value={feedback.rating} />
                    <span className="muted">{formatDate(feedback.createdAt)}</span>
                  </div>
                </div>
                <p className="feedback-comment">{feedback.comment}</p>
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
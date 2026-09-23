import { useEffect, useRef, useState } from 'react';
import type { JSX, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../api/admin';
import type { Appointment, AppointmentStatus, Feedback } from '../../types/auth';
import type { AdminDashboardData } from '../../types/admin';
import {
  AppointmentStatusChart,
  AppointmentsTrendChart,
  FeedbackRatingChart,
  HospitalsByLocationChart,
  PatientRegistrationsChart,
} from '../../components/AdminCharts';

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

const STATUS_OPTIONS: AppointmentStatus[] = ['pending', 'approved', 'rejected', 'cancelled', 'completed'];

const REFRESH_INTERVAL_MS = 20000;

function statusBadgeClass(status: AppointmentStatus): string {
  if (status === 'approved') return 'badge badge-success';
  if (status === 'rejected' || status === 'cancelled') return 'badge badge-danger';
  if (status === 'completed') return 'badge badge-info';
  return 'badge badge-pending';
}

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(value: string): string {
  const [h, m] = value.split(':');
  return new Date(2000, 0, 1, Number(h), Number(m)).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function ratingLabel(rating: number): string {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

interface StatCard {
  label: string;
  value: string;
  accent: string;
}

function StatCards({ stats }: { stats: AdminDashboardData['stats'] }): JSX.Element {
  const cards: StatCard[] = [
    { label: 'Total patients', value: String(stats.totalPatients), accent: 'stat-teal' },
    { label: 'New patients (7d)', value: String(stats.newPatients), accent: 'stat-blue' },
    { label: 'Total appointments', value: String(stats.totalAppointments), accent: 'stat-indigo' },
    { label: 'Pending appointments', value: String(stats.pendingAppointments), accent: 'stat-amber' },
    { label: 'Approved appointments', value: String(stats.approvedAppointments), accent: 'stat-green' },
    { label: 'Rejected appointments', value: String(stats.rejectedAppointments), accent: 'stat-red' },
    { label: 'Hospitals', value: String(stats.hospitals), accent: 'stat-teal' },
    { label: 'Doctors', value: String(stats.doctors), accent: 'stat-blue' },
    { label: 'Feedback received', value: String(stats.feedbackCount), accent: 'stat-amber' },
    { label: 'Average rating', value: `${stats.averageRating.toFixed(1)} / 5`, accent: 'stat-green' },
  ];
  return (
    <div className="stat-grid">
      {cards.map((card) => (
        <div className={`stat-card ${card.accent}`} key={card.label}>
          <div className="stat-value">{card.value}</div>
          <div className="stat-label">{card.label}</div>
        </div>
      ))}
    </div>
  );
}

function EmptyBlock({ children, label }: { children?: ReactNode; label: string }): JSX.Element {
  return (
    <div className="activity-item muted" role="status">
      {children ? children : label}
    </div>
  );
}

function AppointmentDetailModal({
  appointment,
  onClose,
}: {
  appointment: Appointment;
  onClose: () => void;
}): JSX.Element {
  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Appointment details"
    >
      <div className="modal modal-wide">
        <div className="modal-head">
          <h2>Appointment details</h2>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            data-testid="appointment-detail-close"
          >
            Close
          </button>
        </div>
        <div className="modal-body">
          <section className="detail-section">
            <h3>Booking</h3>
            <dl className="detail-grid">
              <div>
                <dt>Status</dt>
                <dd>
                  <span className={statusBadgeClass(appointment.status)}>
                    {STATUS_LABELS[appointment.status] ?? appointment.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Date &amp; time</dt>
                <dd>
                  {formatDate(appointment.appointmentDate)} at{' '}
                  {formatTime(appointment.appointmentTime)}
                </dd>
              </div>
              <div>
                <dt>Reason</dt>
                <dd>{appointment.reason ?? 'No reason provided.'}</dd>
              </div>
              <div>
                <dt>Booked</dt>
                <dd>
                  <span className="muted">{formatDateTime(appointment.createdAt)}</span>
                </dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>
                  <span className="muted">{formatDateTime(appointment.updatedAt)}</span>
                </dd>
              </div>
            </dl>
          </section>

          <section className="detail-section">
            <h3>Patient</h3>
            <dl className="detail-grid">
              <div>
                <dt>Name</dt>
                <dd>{appointment.patient?.name ?? '—'}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{appointment.patient?.email ?? '—'}</dd>
              </div>
            </dl>
          </section>

          <section className="detail-section">
            <h3>Hospital</h3>
            <dl className="detail-grid">
              <div>
                <dt>Name</dt>
                <dd>{appointment.hospital?.name ?? '—'}</dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>{appointment.hospital?.address ?? '—'}</dd>
              </div>
              <div>
                <dt>City</dt>
                <dd>{appointment.hospital?.city ?? '—'}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{appointment.hospital?.phone ?? '—'}</dd>
              </div>
            </dl>
          </section>

          <section className="detail-section">
            <h3>Doctor &amp; department</h3>
            <dl className="detail-grid">
              <div>
                <dt>Department</dt>
                <dd>{appointment.department?.name ?? '—'}</dd>
              </div>
              <div>
                <dt>Doctor</dt>
                <dd>{appointment.doctor?.name ?? '—'}</dd>
              </div>
              <div>
                <dt>Title</dt>
                <dd>{appointment.doctor?.title ?? '—'}</dd>
              </div>
              <div>
                <dt>Specialty</dt>
                <dd>{appointment.doctor?.specialty ?? '—'}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}

function ActivitySection({ dashboard }: { dashboard: AdminDashboardData }): JSX.Element {
  const { patients, appointments, feedback } = dashboard.activity;

  return (
    <section className="activity-grid" aria-label="Recent activity">
      <div className="activity-card">
        <h3>New patients</h3>
        {patients.length === 0 ? (
          <EmptyBlock label="No patients registered yet." />
        ) : (
          <ul className="activity-list">
            {patients.map((p) => (
              <li className="activity-item" key={p.id}>
                <div className="activity-main">
                  <strong>{p.name}</strong>
                  <span className="muted">{p.email}</span>
                </div>
                <span className="activity-time">{formatDateTime(p.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="activity-card">
        <h3>Recent appointments</h3>
        {appointments.length === 0 ? (
          <EmptyBlock label="No appointments booked yet." />
        ) : (
          <ul className="activity-list">
            {appointments.map((a) => (
              <li className="activity-item" key={a.id}>
                <div className="activity-main">
                  <strong>{a.patientName}</strong>
                  <span className="muted">
                    {a.hospitalName} · {a.doctorName}
                  </span>
                  <span className="muted">
                    {formatDate(a.appointmentDate)} at {formatTime(a.appointmentTime)}
                  </span>
                </div>
                <span className={`badge ${statusBadgeClass(a.status)}`}>
                  {STATUS_LABELS[a.status] ?? a.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="activity-card">
        <h3>Recent feedback</h3>
        {feedback.length === 0 ? (
          <EmptyBlock label="No feedback submitted yet." />
        ) : (
          <ul className="activity-list">
            {feedback.map((f) => (
              <li className="activity-item" key={f.id}>
                <div className="activity-main">
                  <strong>{f.patientName}</strong>
                  <span className="muted">{f.hospitalName ?? 'General feedback'}</span>
                  <span className="activity-comment">{f.comment}</span>
                </div>
                <div className="activity-meta">
                  <span className="star-display" aria-label={`${f.rating} out of 5 stars`}>
                    {ratingLabel(f.rating)}
                  </span>
                  <span className="activity-time">{formatDateTime(f.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function AdminDashboard() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [feedback, setFeedback] = useState<Feedback[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [detailAppointment, setDetailAppointment] = useState<Appointment | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedbackBusyId, setFeedbackBusyId] = useState<string | null>(null);
  const [statusDrafts, setStatusDrafts] = useState<Record<string, AppointmentStatus>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const inFlight = useRef(false);

  const refreshAll = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    await Promise.allSettled([
      adminApi
        .getDashboard()
        .then((data) => setDashboard(data))
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load dashboard.')),
      adminApi
        .getAppointments()
        .then(({ appointments: rows }) => {
          setAppointments(rows);
          setStatusDrafts((prev) => {
            const next: Record<string, AppointmentStatus> = {};
            for (const row of rows) {
              next[row.id] = prev[row.id] ?? row.status;
            }
            return next;
          });
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load appointments.')),
      adminApi
        .getFeedback()
        .then(({ feedback: rows }) => setFeedback(rows))
        .catch((err) => setFeedbackError(err instanceof Error ? err.message : 'Failed to load feedback.')),
    ]);
    setLastUpdated(new Date());
    inFlight.current = false;
  };

  useEffect(() => {
    void refreshAll();
    const interval = window.setInterval(() => {
      void refreshAll();
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeFeedback = async (item: Feedback) => {
    const ok = window.confirm('Remove this feedback? A deleted comment cannot be recovered.');
    if (!ok) return;
    setFeedbackBusyId(item.id);
    setFeedbackError(null);
    setFeedbackSuccess(null);
    try {
      await adminApi.deleteFeedback(item.id);
      setFeedbackSuccess('Feedback removed successfully.');
      const [feedbackResult] = await Promise.allSettled([adminApi.getFeedback()]);
      if (feedbackResult.status === 'fulfilled') setFeedback(feedbackResult.value.feedback);
      const [dashboardResult] = await Promise.allSettled([adminApi.getDashboard()]);
      if (dashboardResult.status === 'fulfilled') setDashboard(dashboardResult.value);
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : 'Could not remove the feedback.');
    } finally {
      setFeedbackBusyId(null);
    }
  };

  const setStatus = async (appointment: Appointment, status: AppointmentStatus) => {
    if (status === appointment.status) return;
    setBusyId(appointment.id);
    setError(null);
    setSuccess(null);
    try {
      const { appointment: updated, message } = await adminApi.updateAppointmentStatus(
        appointment.id,
        status,
      );
      setAppointments((prev) => (prev ?? []).map((a) => (a.id === updated.id ? updated : a)));
      setStatusDrafts((prev) => ({ ...prev, [updated.id]: updated.status }));
      setSuccess(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the appointment status.');
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = appointments?.filter((a) => a.status === 'pending').length ?? 0;
  const chartCounts: Record<string, number> = dashboard
    ? {
        pending: dashboard.stats.pendingAppointments,
        approved: dashboard.stats.approvedAppointments,
        rejected: dashboard.stats.rejectedAppointments,
        cancelled: dashboard.stats.cancelledAppointments,
        completed: dashboard.stats.completedAppointments,
      }
    : {};

  return (
    <div className="dashboard">
      <div className="dashboard-hero">
        <h1>Admin Dashboard</h1>
        <p className="muted">
          Signed in as {user?.email}. Live statistics, trends and activity from the database —
          updates automatically every {REFRESH_INTERVAL_MS / 1000} seconds.
          {lastUpdated && <span className="muted"> Last updated {lastUpdated.toLocaleTimeString()}.</span>}
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="feature-grid">
        <Link className="feature-card" to="/admin/patients" data-testid="admin-patients-link">
          <span className="badge badge-active">Ready</span>
          <h3>Patient management</h3>
          <p>View all registered patients, their details, history and feedback.</p>
        </Link>
        <Link className="feature-card" to="/admin/hospitals" data-testid="admin-manage-link">
          <span className="badge badge-active">Ready</span>
          <h3>Hospital management</h3>
          <p>Maintain registered hospitals, departments and their information.</p>
        </Link>
        <Link className="feature-card" to="/admin/hospitals" data-testid="admin-manage-doctors-link">
          <span className="badge badge-active">Ready</span>
          <h3>Doctor management</h3>
          <p>Manage doctor profiles and specialties within each hospital.</p>
        </Link>
      </div>

      {dashboard === null ? (
        <div className="center-screen" role="status" aria-label="Loading dashboard">
          <div className="spinner" />
        </div>
      ) : (
        <>
          <section aria-label="Statistics">
            <h2 className="reports-title">Statistics</h2>
            <StatCards stats={dashboard.stats} />
          </section>

          <section aria-label="Charts">
            <h2 className="reports-title">Analytics</h2>
            <div className="chart-grid">
              <div className="chart-card">
                <h3>Patient registrations (14 days)</h3>
                <div className="chart-wrap">
                  <PatientRegistrationsChart data={dashboard.trends.patientRegistrations} />
                </div>
              </div>
              <div className="chart-card">
                <h3>Appointments over time (14 days)</h3>
                <div className="chart-wrap">
                  <AppointmentsTrendChart data={dashboard.trends.appointments} />
                </div>
              </div>
              <div className="chart-card">
                <h3>Appointment status</h3>
                <div className="chart-wrap">
                  <AppointmentStatusChart counts={chartCounts} />
                </div>
              </div>
              <div className="chart-card">
                <h3>Feedback ratings</h3>
                <div className="chart-wrap">
                  <FeedbackRatingChart data={dashboard.ratingDistribution} />
                </div>
              </div>
              <div className="chart-card chart-card-wide">
                <h3>Hospitals by Tamil Nadu city / district</h3>
                <div className="chart-wrap">
                  <HospitalsByLocationChart data={dashboard.hospitalsByLocation} />
                </div>
              </div>
            </div>
          </section>

          <ActivitySection dashboard={dashboard} />
        </>
      )}

      <h2 className="reports-title">
        Appointment management{' '}
        {appointments !== null && <span className="muted">({pendingCount} pending)</span>}
      </h2>

      {appointments === null && !error && (
        <div className="center-screen" role="status" aria-label="Loading appointments">
          <div className="spinner" />
        </div>
      )}

      {appointments !== null && appointments.length === 0 && (
        <div className="alert alert-info" role="status">
          No appointments have been booked yet. New bookings from patients — including newly
          registered patients — will appear here automatically.
        </div>
      )}

      {appointments !== null && appointments.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Hospital</th>
                <th>Doctor</th>
                <th>Department</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appointment) => (
                <tr key={appointment.id}>
                  <td>
                    <strong>{appointment.patient?.name ?? '—'}</strong>
                    <span className="muted">{appointment.patient?.email ?? ''}</span>
                  </td>
                  <td>{appointment.hospital?.name ?? '—'}</td>
                  <td>
                    {appointment.doctor?.name ?? '—'}
                    <span className="muted"> {appointment.doctor?.specialty ?? ''}</span>
                  </td>
                  <td>{appointment.department?.name ?? '—'}</td>
                  <td>{formatDate(appointment.appointmentDate)}</td>
                  <td>{formatTime(appointment.appointmentTime)}</td>
                  <td>
                    <span className={statusBadgeClass(appointment.status)}>
                      {STATUS_LABELS[appointment.status] ?? appointment.status}
                    </span>
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button
                        type="button"
                        className="btn btn-outline btn-small"
                        onClick={() => setDetailAppointment(appointment)}
                        data-testid="appt-view"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-small"
                        onClick={() => setStatus(appointment, 'approved')}
                        disabled={busyId === appointment.id || appointment.status === 'approved'}
                        data-testid="appt-approve"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-small"
                        onClick={() => setStatus(appointment, 'rejected')}
                        disabled={busyId === appointment.id || appointment.status === 'rejected'}
                        data-testid="appt-reject"
                      >
                        Reject
                      </button>
                      <select
                        value={statusDrafts[appointment.id] ?? appointment.status}
                        onChange={(e) =>
                          setStatusDrafts((prev) => ({
                            ...prev,
                            [appointment.id]: e.target.value as AppointmentStatus,
                          }))
                        }
                        disabled={busyId === appointment.id}
                        aria-label="Update status"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-outline btn-small"
                        onClick={() => setStatus(appointment, statusDrafts[appointment.id] ?? appointment.status)}
                        disabled={busyId === appointment.id}
                        data-testid="appt-apply"
                      >
                        Apply
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="reports-title feedback-title">Feedback management</h2>

      {feedbackError && <div className="alert alert-error">{feedbackError}</div>}
      {feedbackSuccess && <div className="alert alert-success">{feedbackSuccess}</div>}

      {feedback === null && !feedbackError && (
        <div className="center-screen" role="status" aria-label="Loading feedback">
          <div className="spinner" />
        </div>
      )}

      {feedback !== null && feedback.length === 0 && (
        <div className="alert alert-info" role="status">
          No feedback has been submitted yet. Patient ratings and comments — including those from
          newly registered patients — will appear here automatically.
        </div>
      )}

      {feedback !== null && feedback.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Hospital</th>
                <th>Doctor</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {feedback.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.patient?.name ?? '—'}</strong>
                    <span className="muted">{item.patient?.email ?? ''}</span>
                  </td>
                  <td>
                    {item.hospital?.name ?? '—'}
                    {item.hospital?.city ? <span className="muted"> · {item.hospital.city}</span> : null}
                  </td>
                  <td>
                    {item.doctor?.name ?? '—'}
                    <span className="muted"> {item.doctor?.specialty ?? ''}</span>
                  </td>
                  <td>
                    <span className="star-display" aria-label={`${item.rating} out of 5 stars`}>
                      {ratingLabel(item.rating)}
                    </span>
                  </td>
                  <td>{item.comment}</td>
                  <td>
                    <span className="muted">{formatDateTime(item.createdAt)}</span>
                    {item.appointmentDate && (
                      <span className="muted">
                        <br />
                        <small>Visit: {formatDate(item.appointmentDate)}</small>
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-danger btn-small"
                      onClick={() => removeFeedback(item)}
                      disabled={feedbackBusyId === item.id}
                      data-testid="feedback-remove"
                    >
                      {feedbackBusyId === item.id ? 'Removing…' : 'Remove'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detailAppointment && (
        <AppointmentDetailModal
          appointment={detailAppointment}
          onClose={() => setDetailAppointment(null)}
        />
      )}
    </div>
  );
}
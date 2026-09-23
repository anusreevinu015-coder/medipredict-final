import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { appointmentApi } from '../../api/appointment';
import type { Appointment, AppointmentStatus } from '../../types/auth';

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

function statusBadgeClass(status: AppointmentStatus): string {
  if (status === 'approved') return 'badge badge-success';
  if (status === 'rejected' || status === 'cancelled') return 'badge badge-danger';
  if (status === 'completed') return 'badge badge-info';
  return 'badge badge-pending';
}

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
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

export function PatientDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [apptError, setApptError] = useState<string | null>(null);

  useEffect(() => {
    appointmentApi
      .getAppointments()
      .then(({ appointments }) => setAppointments(appointments))
      .catch((err) => setApptError(err instanceof Error ? err.message : 'Failed to load appointments.'));
  }, []);

  return (
    <div className="dashboard">
      <div className="dashboard-hero">
        <h1>Patient Dashboard</h1>
        <p className="muted">
          Welcome back, {user?.name}. This is the foundation of your Medipredict workspace.
        </p>
      </div>
      <div className="feature-grid">
        <div className="feature-card">
          <span className="badge badge-active">Ready</span>
          <h3>AI health assistant</h3>
          <p>Chat about your symptoms and answer a few follow-up questions.</p>
          <Link to="/patient/chat" className="btn btn-outline btn-block card-action">
            Start chatting
          </Link>
        </div>
        <div className="feature-card">
          <span className="badge badge-active">Ready</span>
          <h3>Appointments</h3>
          <p>Book a visit and review the status of your appointments.</p>
          <Link to="/patient/appointments" className="btn btn-outline btn-block card-action">
            Book an appointment
          </Link>
        </div>
        <div className="feature-card">
          <span className="badge badge-active">Ready</span>
          <h3>Profile</h3>
          <p>Your personal and contact details.</p>
          <Link to="/patient/profile" className="btn btn-outline btn-block card-action">
            View profile
          </Link>
        </div>
        <div className="feature-card">
          <span className="badge badge-active">Ready</span>
          <h3>Medical history</h3>
          <p>Managed conditions, allergies and medications.</p>
          <Link to="/patient/medical-history" className="btn btn-outline btn-block card-action">
            View medical history
          </Link>
        </div>
        <div className="feature-card">
          <span className="badge badge-active">Ready</span>
          <h3>Report upload</h3>
          <p>Upload PDF, JPG, JPEG or PNG reports (10 MB max).</p>
          <Link to="/patient/reports" className="btn btn-outline btn-block card-action">
            Manage reports
          </Link>
        </div>
        <div className="feature-card">
          <span className="badge badge-active">Ready</span>
          <h3>Feedback</h3>
          <p>Rate your hospital or appointment experience and leave a comment.</p>
          <Link to="/patient/feedback" className="btn btn-outline btn-block card-action">
            Share feedback
          </Link>
        </div>
      </div>

      <h2 className="reports-title">Your appointments</h2>
      {apptError && <div className="alert alert-error">{apptError}</div>}
      {appointments === null && !apptError && (
        <div className="center-screen" role="status" aria-label="Loading appointments">
          <div className="spinner" />
        </div>
      )}
      {appointments !== null && appointments.length === 0 && (
        <div className="alert alert-info" role="status">
          You don&apos;t have any appointments yet.{' '}
          <Link to="/patient/appointments" className="link">
            Book your first appointment.
          </Link>
        </div>
      )}
      {appointments !== null && appointments.length > 0 && (
        <ul className="appointment-list">
          {appointments.slice(0, 3).map((appointment) => (
            <li className="appointment-item" key={appointment.id}>
              <div className="appointment-main">
                <div className="appointment-title">
                  <strong>{appointment.hospital?.name ?? 'Hospital'}</strong>
                  <span className="muted">
                    {appointment.doctor?.name} · {appointment.department?.name}
                  </span>
                </div>
                <div className="appointment-when">
                  <span className="appointment-datetime">
                    {formatDate(appointment.appointmentDate)} · {formatTime(appointment.appointmentTime)}
                  </span>
                  <span className={statusBadgeClass(appointment.status)}>
                    {STATUS_LABELS[appointment.status] ?? appointment.status}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {appointments !== null && appointments.length > 3 && (
        <Link to="/patient/appointments" className="link">
          View all {appointments.length} appointments
        </Link>
      )}
    </div>
  );
}
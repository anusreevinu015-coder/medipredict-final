import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import type {
  AdminPatientDetail,
  AdminPatientSummary,
} from '../../types/admin';
import type { AppointmentStatus } from '../../types/auth';

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

function statusBadgeClass(status: AppointmentStatus | null): string {
  if (!status) return 'badge badge-pending';
  if (status === 'approved') return 'badge badge-success';
  if (status === 'rejected' || status === 'cancelled') return 'badge badge-danger';
  if (status === 'completed') return 'badge badge-info';
  return 'badge badge-pending';
}

function formatJoinedAt(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
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

function labelOrDash(value: string | null | undefined, fallback = '—'): string {
  return value && value.trim() ? value : fallback;
}

function DetailModal({
  patient,
  onClose,
}: {
  patient: AdminPatientSummary;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<AdminPatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    adminApi
      .getPatientDetail(patient.id)
      .then((data) => {
        if (active) setDetail(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load patient details.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [patient.id]);

  const profile = detail?.patient.profile;
  const medicalHistory = detail?.patient.medicalHistory ?? null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={`Patient details: ${patient.name}`}>
      <div className="modal modal-wide">
        <div className="modal-head">
          <h2>Patient details</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose} data-testid="patient-detail-close">
            Close
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading && (
          <div className="center-screen" role="status" aria-label="Loading patient details">
            <div className="spinner" />
          </div>
        )}

        {!loading && detail && (
          <div className="modal-body">
            <section className="detail-section">
              <h3>Profile</h3>
              <dl className="detail-grid">
                <div>
                  <dt>Name</dt>
                  <dd>{profile?.name ?? '—'}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{profile?.email ?? '—'}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{labelOrDash(profile?.phone ?? null)}</dd>
                </div>
                <div>
                  <dt>Date of birth</dt>
                  <dd>{profile?.dateOfBirth ? formatJoinedAt(`${profile.dateOfBirth}T00:00:00`) : '—'}</dd>
                </div>
                <div>
                  <dt>Gender</dt>
                  <dd>{profile?.gender ? profile.gender : '—'}</dd>
                </div>
                <div>
                  <dt>Address</dt>
                  <dd>{labelOrDash(profile?.address ?? null)}</dd>
                </div>
                <div>
                  <dt>Joined</dt>
                  <dd>{profile ? formatJoinedAt(profile.createdAt) : '—'}</dd>
                </div>
              </dl>
            </section>

            <section className="detail-section">
              <h3>Medical history</h3>
              {medicalHistory === null ? (
                <p className="muted">No medical history recorded yet.</p>
              ) : (
                <dl className="detail-grid">
                  <div>
                    <dt>Conditions</dt>
                    <dd>{labelOrDash(medicalHistory.conditions)}</dd>
                  </div>
                  <div>
                    <dt>Allergies</dt>
                    <dd>{labelOrDash(medicalHistory.allergies)}</dd>
                  </div>
                  <div>
                    <dt>Medications</dt>
                    <dd>{labelOrDash(medicalHistory.medications)}</dd>
                  </div>
                  <div>
                    <dt>Surgeries</dt>
                    <dd>{labelOrDash(medicalHistory.surgeries)}</dd>
                  </div>
                  <div>
                    <dt>Family history</dt>
                    <dd>{labelOrDash(medicalHistory.familyHistory)}</dd>
                  </div>
                  <div>
                    <dt>Notes</dt>
                    <dd>{labelOrDash(medicalHistory.notes)}</dd>
                  </div>
                </dl>
              )}
            </section>

            <section className="detail-section">
              <h3>Appointments ({detail.patient.appointments.length})</h3>
              {detail.patient.appointments.length === 0 ? (
                <p className="muted">This patient has not booked any appointments.</p>
              ) : (
                <ul className="detail-list">
                  {detail.patient.appointments.map((appointment) => (
                    <li className="detail-item" key={appointment.id}>
                      <div className="detail-item-main">
                        <strong>
                          {appointment.hospital?.name ?? 'Hospital'} ·{' '}
                          {appointment.doctor?.name ?? 'Doctor'}
                        </strong>
                        <span className="muted">
                          {appointment.department?.name ?? ''} · {appointment.appointmentDate} at{' '}
                          {appointment.appointmentTime}
                        </span>
                        {appointment.reason && (
                          <span className="muted">Reason: {appointment.reason}</span>
                        )}
                      </div>
                      <span className={statusBadgeClass(appointment.status)}>
                        {STATUS_LABELS[appointment.status] ?? appointment.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="detail-section">
              <h3>Feedback ({detail.patient.feedback.length})</h3>
              {detail.patient.feedback.length === 0 ? (
                <p className="muted">This patient has not submitted any feedback.</p>
              ) : (
                <ul className="detail-list">
                  {detail.patient.feedback.map((item) => (
                    <li className="detail-item" key={item.id}>
                      <div className="detail-item-main">
                        <strong>{item.hospital?.name ?? 'Hospital'}</strong>
                        <span className="muted">
                          {'★'.repeat(item.rating)}
                          {'☆'.repeat(5 - item.rating)} · {formatDateTime(item.createdAt)}
                        </span>
                        <span className="detail-comment">{item.comment}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="detail-section">
              <h3>Uploaded reports ({detail.patient.reports.length})</h3>
              {detail.patient.reports.length === 0 ? (
                <p className="muted">This patient has not uploaded any reports.</p>
              ) : (
                <ul className="detail-list">
                  {detail.patient.reports.map((report) => (
                    <li className="detail-item" key={report.id}>
                      <div className="detail-item-main">
                        <strong>{report.originalFilename}</strong>
                        <span className="muted">
                          Status: {report.status.replace('_', ' ')} · Uploaded{' '}
                          {formatDateTime(report.createdAt)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminPatientsPage() {
  const [patients, setPatients] = useState<AdminPatientSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<AdminPatientSummary | null>(null);

  const load = useCallback(async (msg?: string) => {
    setLoading(true);
    setError(null);
    setNotice(msg ?? null);
    try {
      const { patients } = await adminApi.getPatients();
      setPatients(patients);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load patients.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const rows = patients ?? [];
    if (!trimmed) return rows;
    return rows.filter(
      (p) =>
        p.name.toLowerCase().includes(trimmed) || p.email.toLowerCase().includes(trimmed),
    );
  }, [patients, query]);

  return (
    <div className="dashboard">
      <div className="dashboard-hero">
        <h1>Patients</h1>
        <p className="muted">
          Every registered patient. View profile details, medical history, appointments and
          feedback for a patient by selecting "View".
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      <div className="admin-toolbar">
        <input
          className="admin-search"
          type="search"
          placeholder="Search by name or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search patients"
          data-testid="patients-search"
        />
        <button type="button" className="btn btn-outline" onClick={() => load()}>
          Refresh
        </button>
        <Link to="/admin" className="btn btn-ghost">
          Back to dashboard
        </Link>
      </div>

      {loading && (
        <div className="center-screen" role="status" aria-label="Loading patients">
          <div className="spinner" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="alert alert-info" role="status">
          {query.trim()
            ? 'No patients match your search.'
            : 'No patients have registered yet. New sign-ups will appear here automatically.'}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Phone</th>
                <th>Joined</th>
                <th>Appointments</th>
                <th>Feedback</th>
                <th>Reports</th>
                <th>Last status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((patient) => (
                <tr key={patient.id} data-testid="admin-patient-row">
                  <td>
                    <strong>{patient.name}</strong>
                    <span className="muted">{patient.email}</span>
                  </td>
                  <td>{patient.phone ?? '—'}</td>
                  <td>
                    <span className="muted">{formatJoinedAt(patient.createdAt)}</span>
                  </td>
                  <td>{patient.appointmentCount}</td>
                  <td>{patient.feedbackCount}</td>
                  <td>{patient.reportCount}</td>
                  <td>
                    <span className={statusBadgeClass(patient.lastAppointmentStatus)}>
                      {patient.lastAppointmentStatus
                        ? STATUS_LABELS[patient.lastAppointmentStatus]
                        : '—'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-outline btn-small"
                      onClick={() => setSelected(patient)}
                      data-testid="patient-view"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <DetailModal
          patient={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
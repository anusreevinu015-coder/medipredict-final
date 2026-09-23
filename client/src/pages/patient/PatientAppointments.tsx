import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { appointmentApi } from '../../api/appointment';
import { hospitalApi } from '../../api/hospital';
import type { HospitalCatalogItem } from '../../types/hospital';
import type { Appointment, AppointmentStatus } from '../../types/auth';

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

const REFRESH_INTERVAL_MS = 15000;

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
  if (!value) return value;
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(value: string): string {
  if (!value) return value;
  const [h, m] = value.split(':');
  return new Date(2000, 0, 1, Number(h), Number(m)).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function todayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
}

export function PatientAppointmentsPage() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [catalog, setCatalog] = useState<HospitalCatalogItem[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  const [city, setCity] = useState('all');
  const [hospitalId, setHospitalId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(todayString());
  const [appointmentTime, setAppointmentTime] = useState('09:00');
  const [reason, setReason] = useState('');

  const [booking, setBooking] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadAppointments = async (silent = false) => {
    if (!silent) setLoading(true);
    if (silent) setRefreshing(true);
    setError(null);
    try {
      const { appointments } = await appointmentApi.getAppointments();
      setAppointments(appointments);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your appointments.');
    } finally {
      if (!silent) setLoading(false);
      if (silent) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadAppointments(true);
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    hospitalApi
      .catalog()
      .then((result) => {
        if (!active) return;
        setCatalog(result.hospitals);
        setCities(result.cities);
        setCatalogLoaded(true);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load available hospitals.');
        setCatalogLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!catalogLoaded || catalog.length === 0) return;
    const urlHospital = searchParams.get('hospital');
    const urlDepartment = searchParams.get('department');
    const urlDoctor = searchParams.get('doctor');
    if (urlHospital && !hospitalId) {
      const hospital = catalog.find((h) => h.id === urlHospital);
      if (hospital) {
        setHospitalId(hospital.id);
        setCity(hospital.city);
        const department = hospital.departments.find((d) => d.id === urlDepartment) ?? hospital.departments[0];
        if (department) {
          setDepartmentId(department.id);
          const doctor =
            department.doctors.find((d) => d.id === urlDoctor) ?? department.doctors[0] ?? null;
          if (doctor) setDoctorId(doctor.id);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogLoaded, catalog.length]);

  const selectedHospital = useMemo(
    () => catalog.find((h) => h.id === hospitalId) ?? null,
    [catalog, hospitalId],
  );
  const filteredHospitals = useMemo(
    () =>
      city === 'all'
        ? catalog
        : catalog.filter((h) => h.city === city || h.district === city),
    [catalog, city],
  );
  const selectedDepartment = useMemo(
    () => selectedHospital?.departments.find((d) => d.id === departmentId) ?? null,
    [selectedHospital, departmentId],
  );

  const handleHospitalChange = (id: string) => {
    setHospitalId(id);
    setDepartmentId('');
    setDoctorId('');
  };

  const handleDepartmentChange = (id: string) => {
    setDepartmentId(id);
    setDoctorId('');
  };

  const handleBooking = async () => {
    setFormError(null);
    setFormSuccess(null);
    if (!hospitalId || !departmentId || !doctorId) {
      setFormError('Please select a hospital, department and doctor.');
      return;
    }
    if (!appointmentDate) {
      setFormError('Please choose an appointment date.');
      return;
    }
    if (appointmentDate < todayString()) {
      setFormError('The appointment date cannot be in the past.');
      return;
    }

    setBooking(true);
    try {
      const { appointment, message } = await appointmentApi.bookAppointment({
        hospitalId,
        departmentId,
        doctorId,
        appointmentDate,
        appointmentTime,
        reason: reason.trim() || undefined,
      });
      setAppointments((prev) => [appointment, ...prev]);
      setHospitalId('');
      setDepartmentId('');
      setDoctorId('');
      setReason('');
      setFormSuccess(message);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not book the appointment.');
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card appointments-card">
        <h1>Book an Appointment</h1>
        <p className="muted">
          Choose a hospital, department and doctor, then pick a date and time. An administrator will
          approve your booking before it is confirmed.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="booking-form">
          <label>
            City / District (Tamil Nadu)
            <select value={city} onChange={(e) => {
              setCity(e.target.value);
              setHospitalId('');
              setDepartmentId('');
              setDoctorId('');
            }} disabled={cities.length === 0} data-testid="appt-city">
              <option value="all">All locations</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label>
            Hospital
            <select value={hospitalId} onChange={(e) => handleHospitalChange(e.target.value)} disabled={filteredHospitals.length === 0} data-testid="appt-hospital">
              <option value="">Select a hospital…</option>
              {filteredHospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} — {h.city}
                  {h.district ? ` (${h.district})` : ''}
                </option>
              ))}
            </select>
          </label>

          <label>
            Department
            <select value={departmentId} onChange={(e) => handleDepartmentChange(e.target.value)} disabled={!selectedHospital} data-testid="appt-department">
              <option value="">Select a department…</option>
              {selectedHospital?.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Doctor
            <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} disabled={!selectedDepartment} data-testid="appt-doctor">
              <option value="">Select a doctor…</option>
              {selectedDepartment?.doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name} — {doctor.title} · {doctor.specialty}
                </option>
              ))}
            </select>
          </label>

          <div className="booking-datetime">
            <label>
              Date
              <input
                type="date"
                value={appointmentDate}
                min={todayString()}
                onChange={(e) => setAppointmentDate(e.target.value)}
                data-testid="appt-date"
              />
            </label>
            <label>
              Time
              <select value={appointmentTime} onChange={(e) => setAppointmentTime(e.target.value)} data-testid="appt-time">
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {formatTime(slot)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Reason (optional)
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Briefly describe why you need the appointment"
              data-testid="appt-reason"
            />
          </label>

          {formError && <div className="alert alert-error">{formError}</div>}
          {formSuccess && <div className="alert alert-success">{formSuccess}</div>}

          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={handleBooking}
            disabled={booking}
            data-testid="appt-book"
          >
            {booking ? 'Booking…' : 'Book appointment'}
          </button>
        </div>

        <h2 className="reports-title">
          Your appointments{' '}
          <button
            type="button"
            className="btn btn-outline btn-small appointment-refresh"
            onClick={() => loadAppointments(true)}
            disabled={refreshing}
            data-testid="appt-refresh"
          >
            {refreshing ? 'Refreshing…' : 'Refresh status'}
          </button>
        </h2>
        <p className="muted appointment-status-note">
          Approval status from the administrator updates automatically every{' '}
          {Math.round(REFRESH_INTERVAL_MS / 1000)} seconds.
          {lastUpdated && (
            <span className="muted"> Last updated at {lastUpdated.toLocaleTimeString()}.</span>
          )}
        </p>

        {loading && (
          <div className="center-screen" role="status" aria-label="Loading appointments">
            <div className="spinner" />
          </div>
        )}

        {!loading && appointments.length === 0 && (
          <div className="alert alert-info" role="status">
            You don&apos;t have any appointments yet. Use the form above to book your first one.
          </div>
        )}

        {!loading && appointments.length > 0 && (
          <ul className="appointment-list">
            {appointments.map((appointment) => (
              <li className="appointment-item" key={appointment.id}>
                <div className="appointment-main">
                  <div className="appointment-title">
                    <strong>{appointment.hospital?.name ?? 'Hospital'}</strong>
                    <span className="muted">
                      {appointment.doctor?.name} · {appointment.doctor?.title} ·{' '}
                      {appointment.doctor?.specialty}
                    </span>
                    <span className="muted">
                      {appointment.department?.name}
                      {appointment.hospital ? ` · ${appointment.hospital.city}` : ''}
                    </span>
                    {appointment.reason && (
                      <span className="muted appointment-reason">Reason: {appointment.reason}</span>
                    )}
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

        <div className="auth-footer">
          <Link to="/patient" className="link">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
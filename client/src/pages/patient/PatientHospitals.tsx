import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { hospitalApi } from '../../api/hospital';
import type { HospitalRecommendation } from '../../types/hospital';

const DISCLAIMER =
  'Hospitals and doctors shown here are maintained by the administrator and are registered ' +
  'in Tamil Nadu, India. Contact the facility directly to confirm availability before visiting. ' +
  'These recommendations are based on your AI-assisted health assessment, which is educational ' +
  'only and not a diagnosis.';

function displayLocation(hospital: HospitalRecommendation): string {
  const district = hospital.district ?? hospital.city;
  return `${hospital.city} · ${district} District, ${hospital.state}`;
}

function displaySpecialty(name: string): string {
  return name.length > 0 ? name : '—';
}

export function PatientHospitalsPage() {
  const [searchParams] = useSearchParams();
  const specialty = (searchParams.get('specialty') ?? '').trim();
  const [city, setCity] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hospitals, setHospitals] = useState<HospitalRecommendation[]>([]);
  const [cities, setCities] = useState<string[]>([]);

  const load = async (cityFilter: string) => {
    setLoading(true);
    setError(null);
    try {
      const params: { specialty: string; location?: string } = { specialty };
      if (cityFilter && cityFilter !== 'all') params.location = cityFilter;
      const result = await hospitalApi.recommendations(params);
      setHospitals(result.hospitals);
      setCities((prev) => Array.from(new Set([...prev, ...result.cities])).sort());
    } catch (err) {
      setHospitals([]);
      setError(err instanceof Error ? err.message : 'Failed to load hospital recommendations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!specialty) {
      setLoading(false);
      setError('No specialty was provided. Generate a health assessment in the chat first.');
      return;
    }
    load(city);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialty, city]);

  return (
    <div className="auth-wrap">
      <div className="auth-card hospitals-card">
        <h1>Recommended Hospitals</h1>
        <p className="muted">
          Facilities matching the recommended specialty:{' '}
          <strong>{displaySpecialty(specialty)}</strong>.
        </p>

        <div className="hosp-filter">
          <label htmlFor="hosp-city">
            City / District (Tamil Nadu)
            <select
              id="hosp-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={loading || cities.length === 0}
              data-testid="hospital-city"
            >
              <option value="all">All locations</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading && (
          <div className="center-screen" role="status" aria-label="Loading hospitals">
            <div className="spinner" />
          </div>
        )}

        {!loading && error && <div className="alert alert-error">{error}</div>}

        {!loading && !error && hospitals.length === 0 && (
          <div className="alert alert-info" role="status">
            No hospitals are currently listed for the {displaySpecialty(specialty)} department in
            the selected location. Try another city, or check back later.
          </div>
        )}

        {!loading &&
          !error &&
          hospitals.map((hospital) => (
            <div className="hosp-card" key={hospital.id} data-testid="hospital-card">
              <div className="hosp-head">
                <div className="hosp-title">
                  <h3>{hospital.name}</h3>
                  <p className="muted hosp-address">{hospital.address}</p>
                  <p className="muted hosp-address">{displayLocation(hospital)}</p>
                </div>
                <span className="badge badge-info">{hospital.department.name}</span>
                <Link
                  to={`/patient/appointments?hospital=${hospital.id}&department=${hospital.department.id}`}
                  className="btn btn-outline hosp-book"
                  data-testid="hospital-book"
                >
                  Book appointment
                </Link>
              </div>

              {hospital.phone && <p className="muted hosp-phone">Phone: {hospital.phone}</p>}
              {hospital.availability && (
                <p className="muted hosp-phone">Availability: {hospital.availability}</p>
              )}

              <h4 className="hosp-doctors-title">Doctors in this department</h4>
              {hospital.doctors.length === 0 ? (
                <p className="muted">
                  No doctors are listed for this department yet — contact the hospital directly for
                  details.
                </p>
              ) : (
                <ul className="doctor-list">
                  {hospital.doctors.map((doctor) => (
                    <li className="doctor-item" key={doctor.id}>
                      <div className="doctor-meta">
                        <strong>{doctor.name}</strong>
                        <span className="muted doctor-specialty">
                          {doctor.title} · {doctor.specialty}
                        </span>
                        {doctor.experience !== null && doctor.experience !== undefined && (
                          <span className="muted doctor-specialty">
                            {doctor.experience} years experience
                          </span>
                        )}
                      </div>
                      {doctor.availability && (
                        <span className="doctor-availability">
                          Appointments: {doctor.availability}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

        <div className="chat-disclaimer" role="note">
          {DISCLAIMER}
        </div>

        <div className="auth-footer">
          <Link to="/patient/chat" className="link">
            Back to chat
          </Link>
        </div>
      </div>
    </div>
  );
}
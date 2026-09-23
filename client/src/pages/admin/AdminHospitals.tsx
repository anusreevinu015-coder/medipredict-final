import { useEffect, useState } from 'react';
import { adminApi, type DoctorInput, type HospitalInput } from '../../api/admin';
import type {
  Doctor,
  HospitalCatalogItem,
  HospitalDepartment,
} from '../../types/hospital';

interface Notice {
  type: 'success' | 'error';
  text: string;
}

const TN_STATE = 'Tamil Nadu';

const TN_DISTRICTS = [
  'Chennai',
  'Coimbatore',
  'Madurai',
  'Tiruchirappalli',
  'Salem',
  'Vellore',
  'Tirunelveli',
  'Erode',
  'Thanjavur',
  'Thoothukudi',
  'Dindigul',
  'Karur',
  'Namakkal',
  'Krishnagiri',
  'Dharmapuri',
  'Villupuram',
  'Cuddalore',
  'Nagapattinam',
  'Chengam',
  'Perambalur',
  'Ariyalur',
  'Sivaganga',
  'Pudukkottai',
  'Ramanathapuram',
  'Tiruppur',
  'Tenkasi',
  'Ranipet',
  'Tirupathur',
  'Kallakurichi',
  'Mayiladuthurai',
];

function emptyHospitalValues(): HospitalInput {
  return {
    name: '',
    city: '',
    district: '',
    state: TN_STATE,
    address: '',
    phone: '',
    email: '',
    website: '',
    availability: '',
  };
}

function emptyDepartmentValues(): { name: string; description: string } {
  return { name: '', description: '' };
}

function emptyDoctorValues(): DoctorInput & { experienceText: string } {
  return {
    departmentId: '',
    name: '',
    title: '',
    specialty: '',
    experienceText: '',
    availability: '',
  };
}

export function AdminHospitalsPage() {
  const [hospitals, setHospitals] = useState<HospitalCatalogItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);

  const [hospitalEditingId, setHospitalEditingId] = useState<string | null>(null);
  const [hospitalEditingNew, setHospitalEditingNew] = useState(false);
  const [hospitalForm, setHospitalForm] = useState<HospitalInput>(emptyHospitalValues());

  const [deptHospitalId, setDeptHospitalId] = useState<string | null>(null);
  const [deptEditingId, setDeptEditingId] = useState<string | null>(null);
  const [deptEditingNew, setDeptEditingNew] = useState(false);
  const [deptForm, setDeptForm] = useState(emptyDepartmentValues());

  const [docHospitalId, setDocHospitalId] = useState<string | null>(null);
  const [docEditingId, setDocEditingId] = useState<string | null>(null);
  const [docEditingNew, setDocEditingNew] = useState(false);
  const [docForm, setDocForm] = useState(emptyDoctorValues());

  const load = async (msg?: string) => {
    setLoading(true);
    setError(null);
    setNotice(msg ? { type: 'success', text: msg } : notice);
    try {
      const { hospitals } = await adminApi.getHospitals();
      setHospitals(hospitals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hospitals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const failNotice = (err: unknown) =>
    setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Something went wrong.' });

  // ---------------------------------------------------------------- Hospitals
  const openAddHospital = () => {
    setHospitalEditingNew(true);
    setHospitalEditingId(null);
    setHospitalForm(emptyHospitalValues());
    setNotice(null);
  };

  const openEditHospital = (hospital: HospitalCatalogItem) => {
    setHospitalEditingNew(false);
    setHospitalEditingId(hospital.id);
    setHospitalForm({
      name: hospital.name,
      city: hospital.city,
      district: hospital.district ?? '',
      state: hospital.state,
      address: hospital.address,
      phone: hospital.phone ?? '',
      email: hospital.email ?? '',
      website: hospital.website ?? '',
      availability: hospital.availability ?? '',
    });
    setNotice(null);
  };

  const closeHospitalEditor = () => {
    setHospitalEditingId(null);
    setHospitalEditingNew(false);
  };

  const saveHospital = async () => {
    if (!hospitalForm.name.trim() || !hospitalForm.city.trim() || !hospitalForm.address.trim()) {
      setNotice({ type: 'error', text: 'Hospital name, city and address are required.' });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      if (hospitalEditingNew) {
        const { message } = await adminApi.addHospital(hospitalForm);
        closeHospitalEditor();
        await reloadWith(message);
      } else if (hospitalEditingId) {
        const { message } = await adminApi.updateHospital(hospitalEditingId, hospitalForm);
        closeHospitalEditor();
        await reloadWith(message);
      }
    } catch (err) {
      failNotice(err);
    } finally {
      setBusy(false);
    }
  };

  const deleteHospital = async (hospital: HospitalCatalogItem) => {
    const ok = window.confirm(
      `Delete "${hospital.name}"? This removes its departments and doctors. This action cannot be undone.`,
    );
    if (!ok) return;
    setBusy(true);
    setNotice(null);
    try {
      const { message } = await adminApi.deleteHospital(hospital.id);
      await reloadWith(message);
    } catch (err) {
      failNotice(err);
    } finally {
      setBusy(false);
    }
  };

  const reloadWith = async (message: string) => {
    setLoading(true);
    setError(null);
    try {
      const { hospitals } = await adminApi.getHospitals();
      setHospitals(hospitals);
      setNotice({ type: 'success', text: message });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reload hospitals.');
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------ Departments
  const openAddDepartment = (hospitalId: string) => {
    setDeptHospitalId(hospitalId);
    setDeptEditingNew(true);
    setDeptEditingId(null);
    setDeptForm(emptyDepartmentValues());
  };

  const openEditDepartment = (hospitalId: string, department: HospitalDepartment) => {
    setDeptHospitalId(hospitalId);
    setDeptEditingNew(false);
    setDeptEditingId(department.id);
    setDeptForm({ name: department.name, description: department.description ?? '' });
  };

  const closeDepartmentEditor = () => {
    setDeptHospitalId(null);
    setDeptEditingId(null);
    setDeptEditingNew(false);
  };

  const saveDepartment = async () => {
    if (!deptForm.name.trim()) {
      setNotice({ type: 'error', text: 'Department name is required.' });
      return;
    }
    if (!deptHospitalId) return;
    setBusy(true);
    setNotice(null);
    try {
      if (deptEditingNew) {
        const { message } = await adminApi.addDepartment(deptHospitalId, deptForm);
        closeDepartmentEditor();
        await reloadWith(message);
      } else if (deptEditingId) {
        const { message } = await adminApi.updateDepartment(
          deptHospitalId,
          deptEditingId,
          deptForm,
        );
        closeDepartmentEditor();
        await reloadWith(message);
      }
    } catch (err) {
      failNotice(err);
    } finally {
      setBusy(false);
    }
  };

  const deleteDepartment = async (hospitalId: string, department: HospitalDepartment) => {
    const ok = window.confirm(`Delete the "${department.name}" department?`);
    if (!ok) return;
    setBusy(true);
    setNotice(null);
    try {
      const { message } = await adminApi.deleteDepartment(hospitalId, department.id);
      await reloadWith(message);
    } catch (err) {
      failNotice(err);
    } finally {
      setBusy(false);
    }
  };

  // ---------------------------------------------------------------- Doctors
  const openAddDoctor = (hospital: HospitalCatalogItem, departmentId?: string) => {
    setDocHospitalId(hospital.id);
    setDocEditingNew(true);
    setDocEditingId(null);
    setDocForm({ ...emptyDoctorValues(), departmentId: departmentId ?? hospital.departments[0]?.id ?? '' });
  };

  const openEditDoctor = (hospital: HospitalCatalogItem, doctor: Doctor) => {
    const department = hospital.departments.find((d) =>
      d.doctors.some((doc) => doc.id === doctor.id),
    );
    setDocHospitalId(hospital.id);
    setDocEditingNew(false);
    setDocEditingId(doctor.id);
    setDocForm({
      departmentId: department?.id ?? '',
      name: doctor.name,
      title: doctor.title,
      specialty: doctor.specialty,
      experienceText: doctor.experience === null || doctor.experience === undefined ? '' : String(doctor.experience),
      availability: doctor.availability ?? '',
    });
  };

  const closeDoctorEditor = () => {
    setDocHospitalId(null);
    setDocEditingId(null);
    setDocEditingNew(false);
  };

  const saveDoctor = async () => {
    if (!docHospitalId) return;
    if (!docForm.name.trim() || !docForm.title.trim() || !docForm.specialty.trim()) {
      setNotice({ type: 'error', text: 'Doctor name, title and specialization are required.' });
      return;
    }
    if (!docForm.departmentId) {
      setNotice({ type: 'error', text: 'Please select a department for this doctor.' });
      return;
    }
    const experience = docForm.experienceText.trim();
    setBusy(true);
    setNotice(null);
    try {
      const payload: DoctorInput = {
        departmentId: docForm.departmentId,
        name: docForm.name,
        title: docForm.title,
        specialty: docForm.specialty,
        experience: experience === '' ? null : Number(experience),
        availability: (docForm.availability ?? '').trim() || null,
      };
      if (docEditingNew) {
        const { message } = await adminApi.addDoctor(docHospitalId, payload);
        closeDoctorEditor();
        await reloadWith(message);
      } else if (docEditingId) {
        const { message } = await adminApi.updateDoctor(docHospitalId, docEditingId, payload);
        closeDoctorEditor();
        await reloadWith(message);
      }
    } catch (err) {
      failNotice(err);
    } finally {
      setBusy(false);
    }
  };

  const deleteDoctor = async (hospitalId: string, doctor: Doctor) => {
    const ok = window.confirm(`Delete doctor "${doctor.name}"?`);
    if (!ok) return;
    setBusy(true);
    setNotice(null);
    try {
      const { message } = await adminApi.deleteDoctor(hospitalId, doctor.id);
      await reloadWith(message);
    } catch (err) {
      failNotice(err);
    } finally {
      setBusy(false);
    }
  };

  // ------------------------------------------------------------------ Render
  if (loading && hospitals === null) {
    return (
      <div className="center-screen" role="status" aria-label="Loading hospitals">
        <div className="spinner" />
      </div>
    );
  }

  if (hospitals === null && error) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <h1>Hospital Management</h1>
          <div className="alert alert-error">{error}</div>
          <button type="button" className="btn btn-primary btn-block" onClick={() => load()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const hospitalEditorOpen = hospitalEditingNew || hospitalEditingId !== null;
  const deptEditorOpen = (deptEditingNew || deptEditingId !== null) && deptHospitalId !== null;
  const docEditorOpen = (docEditingNew || docEditingId !== null) && docHospitalId !== null;
  const editingHospital = hospitalEditingId
    ? hospitals?.find((h) => h.id === hospitalEditingId) ?? null
    : null;
  const editingHospitalObj = docHospitalId
    ? hospitals?.find((h) => h.id === docHospitalId) ?? null
    : null;

  return (
    <div className="dashboard">
      <div className="dashboard-hero">
        <h1>Hospital Management</h1>
        <p className="muted">
          Manage hospitals, departments and doctors. New hospitals default to Tamil Nadu, India.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && notice.type === 'error' && <div className="alert alert-error">{notice.text}</div>}
      {notice && notice.type === 'success' && <div className="alert alert-success">{notice.text}</div>}

      <div className="admin-toolbar">
        <button type="button" className="btn btn-primary" onClick={openAddHospital} disabled={busy}>
          + Add hospital
        </button>
      </div>

      {hospitalEditorOpen && (
        <div className="admin-form-card">
          <h3>{hospitalEditingNew ? 'Add hospital' : `Edit: ${editingHospital?.name ?? ''}`}</h3>
          <div className="admin-form-grid">
            <label>
              Hospital name *
              <input
                type="text"
                value={hospitalForm.name}
                onChange={(e) => setHospitalForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Sample City Hospital (Sample)"
                data-testid="hosp-name"
              />
            </label>
            <label>
              City *
              <input
                type="text"
                value={hospitalForm.city}
                onChange={(e) => setHospitalForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="e.g. Chennai"
                data-testid="hosp-city"
              />
            </label>
            <label>
              District
              <input
                type="text"
                list="tn-districts"
                value={hospitalForm.district ?? ''}
                onChange={(e) => setHospitalForm((f) => ({ ...f, district: e.target.value }))}
                placeholder="e.g. Chennai"
                data-testid="hosp-district"
              />
              <datalist id="tn-districts">
                {TN_DISTRICTS.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </label>
            <label>
              State *
              <input
                type="text"
                value={hospitalForm.state}
                onChange={(e) => setHospitalForm((f) => ({ ...f, state: e.target.value }))}
                data-testid="hosp-state"
              />
            </label>
            <label className="admin-form-span">
              Address *
              <input
                type="text"
                value={hospitalForm.address}
                onChange={(e) => setHospitalForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Street, city, state, PIN"
                data-testid="hosp-address"
              />
            </label>
            <label>
              Phone
              <input
                type="text"
                value={hospitalForm.phone ?? ''}
                onChange={(e) => setHospitalForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="e.g. (044) 2400-0001"
                data-testid="hosp-phone"
              />
            </label>
            <label>
              Email
              <input
                type="text"
                value={hospitalForm.email ?? ''}
                onChange={(e) => setHospitalForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="info@hospital.example.in"
                data-testid="hosp-email"
              />
            </label>
            <label>
              Website
              <input
                type="text"
                value={hospitalForm.website ?? ''}
                onChange={(e) => setHospitalForm((f) => ({ ...f, website: e.target.value }))}
                placeholder="www.hospital.example.in"
                data-testid="hosp-website"
              />
            </label>
            <label className="admin-form-span">
              Availability
              <input
                type="text"
                value={hospitalForm.availability ?? ''}
                onChange={(e) => setHospitalForm((f) => ({ ...f, availability: e.target.value }))}
                placeholder="e.g. Mon-Sat 8:00 AM - 8:00 PM"
                data-testid="hosp-availability"
              />
            </label>
          </div>
          <div className="admin-form-actions">
            <button type="button" className="btn btn-outline" onClick={closeHospitalEditor} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={saveHospital} disabled={busy}>
              {busy ? 'Saving…' : hospitalEditingNew ? 'Add hospital' : 'Save changes'}
            </button>
          </div>
        </div>
      )}

      {deptEditorOpen && (
        <div className="admin-form-card">
          <h3>{deptEditingNew ? 'Add department' : 'Edit department'}</h3>
          <div className="admin-form-grid">
            <label>
              Department name *
              <input
                type="text"
                value={deptForm.name}
                onChange={(e) => setDeptForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Cardiology"
                data-testid="dept-name"
              />
            </label>
            <label className="admin-form-span">
              Description
              <input
                type="text"
                value={deptForm.description}
                onChange={(e) => setDeptForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Heart and cardiovascular care"
                data-testid="dept-description"
              />
            </label>
          </div>
          <div className="admin-form-actions">
            <button type="button" className="btn btn-outline" onClick={closeDepartmentEditor} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={saveDepartment} disabled={busy}>
              {busy ? 'Saving…' : deptEditingNew ? 'Add department' : 'Save changes'}
            </button>
          </div>
        </div>
      )}

      {docEditorOpen && editingHospitalObj && (
        <div className="admin-form-card">
          <h3>{docEditingNew ? `Add doctor to ${editingHospitalObj.name}` : 'Edit doctor'}</h3>
          <div className="admin-form-grid">
            <label>
              Doctor name *
              <input
                type="text"
                value={docForm.name}
                onChange={(e) => setDocForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Dr. Sample Kumar"
                data-testid="doc-name"
              />
            </label>
            <label>
              Title *
              <input
                type="text"
                value={docForm.title}
                onChange={(e) => setDocForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. MD"
                data-testid="doc-title"
              />
            </label>
            <label>
              Specialization *
              <input
                type="text"
                value={docForm.specialty}
                onChange={(e) => setDocForm((f) => ({ ...f, specialty: e.target.value }))}
                placeholder="e.g. Cardiologist"
                data-testid="doc-specialty"
              />
            </label>
            <label>
              Department *
              <select
                value={docForm.departmentId}
                onChange={(e) => setDocForm((f) => ({ ...f, departmentId: e.target.value }))}
                data-testid="doc-department"
              >
                {editingHospitalObj.departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Experience (years)
              <input
                type="number"
                min={0}
                max={70}
                value={docForm.experienceText}
                onChange={(e) => setDocForm((f) => ({ ...f, experienceText: e.target.value }))}
                placeholder="e.g. 10"
                data-testid="doc-experience"
              />
            </label>
            <label className="admin-form-span">
              Available days / times
              <input
                type="text"
                value={docForm.availability ?? ''}
                onChange={(e) => setDocForm((f) => ({ ...f, availability: e.target.value }))}
                placeholder="e.g. Mon-Fri 9:00 AM - 5:00 PM"
                data-testid="doc-availability"
              />
            </label>
          </div>
          <div className="admin-form-actions">
            <button type="button" className="btn btn-outline" onClick={closeDoctorEditor} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={saveDoctor} disabled={busy}>
              {busy ? 'Saving…' : docEditingNew ? 'Add doctor' : 'Save changes'}
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="center-screen" role="status" aria-label="Reloading hospitals">
          <div className="spinner" />
        </div>
      )}

      {!loading && hospitals !== null && hospitals.length === 0 && (
        <div className="alert alert-info" role="status">
          No hospitals yet. Use "Add hospital" above to create your first one.
        </div>
      )}

      {!loading &&
        hospitals !== null &&
        hospitals.map((hospital) => (
          <div className="hosp-card admin-hosp-card" key={hospital.id} data-testid="admin-hospital">
            <div className="hosp-head">
              <div className="hosp-title">
                <h3>{hospital.name}</h3>
                <p className="muted hosp-address">{hospital.address}</p>
                <p className="muted hosp-address">
                  {hospital.city} · {hospital.district ? `${hospital.district} District` : 'District not set'} · {hospital.state}
                </p>
              </div>
              <div className="hosp-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => openEditHospital(hospital)}
                  disabled={busy}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => deleteHospital(hospital)}
                  disabled={busy}
                >
                  Delete
                </button>
              </div>
            </div>

            <p className="muted hosp-phone">
              {hospital.phone && <>Phone: {hospital.phone} · </>}
              {hospital.email && <>Email: {hospital.email} · </>}
              {hospital.website && <>Web: {hospital.website}</>}
              {!hospital.phone && !hospital.email && !hospital.website && 'No contact details set.'}
            </p>
            {hospital.availability && <p className="muted hosp-phone">Availability: {hospital.availability}</p>}

            <div className="admin-dept-header">
              <h4>Departments ({hospital.departments.length})</h4>
              <button
                type="button"
                className="btn btn-outline btn-small"
                onClick={() => openAddDepartment(hospital.id)}
                disabled={busy}
              >
                + Add department
              </button>
            </div>

            {hospital.departments.length === 0 ? (
              <p className="muted">No departments yet. Add one to start listing doctors.</p>
            ) : (
              <ul className="admin-dept-list">
                {hospital.departments.map((department) => (
                  <li className="admin-dept-item" key={department.id}>
                    <div className="admin-dept-head">
                      <div>
                        <strong>{department.name}</strong>
                        {department.description && (
                          <span className="muted"> — {department.description}</span>
                        )}
                      </div>
                      <div className="hosp-actions">
                        <button
                          type="button"
                          className="btn btn-outline btn-small"
                          onClick={() => openAddDoctor(hospital, department.id)}
                          disabled={busy}
                        >
                          + Doctor
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-small"
                          onClick={() => openEditDepartment(hospital.id, department)}
                          disabled={busy}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-small"
                          onClick={() => deleteDepartment(hospital.id, department)}
                          disabled={busy}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {department.doctors.length === 0 ? (
                      <p className="muted">No doctors listed in this department.</p>
                    ) : (
                      <ul className="doctor-list">
                        {department.doctors.map((doctor) => (
                          <li className="doctor-item" key={doctor.id}>
                            <div className="doctor-meta">
                              <strong>{doctor.name}</strong>
                              <span className="muted doctor-specialty">
                                {doctor.title} · {doctor.specialty}
                                {doctor.experience !== null && doctor.experience !== undefined
                                  ? ` · ${doctor.experience} yrs`
                                  : ''}
                              </span>
                              {doctor.availability && (
                                <span className="muted doctor-specialty">
                                  Available: {doctor.availability}
                                </span>
                              )}
                            </div>
                            <div className="hosp-actions">
                              <button
                                type="button"
                                className="btn btn-outline btn-small"
                                onClick={() => openEditDoctor(hospital, doctor)}
                                disabled={busy}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-small"
                                onClick={() => deleteDoctor(hospital.id, doctor)}
                                disabled={busy}
                              >
                                Delete
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    <button
                      type="button"
                      className="btn btn-outline btn-small admin-doctor-add"
                      onClick={() => openAddDoctor(hospital, department.id)}
                      disabled={busy}
                    >
                      + Add doctor
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
    </div>
  );
}
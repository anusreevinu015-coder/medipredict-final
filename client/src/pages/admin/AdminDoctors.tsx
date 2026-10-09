import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, type DoctorInput } from '../../api/admin';
import type { AdminDoctorRow, HospitalCatalogItem } from '../../types/hospital';

interface Notice {
  type: 'success' | 'error';
  text: string;
}

const PAGE_SIZE = 25;

function emptyEditorValues(): DoctorInput & { hospitalId: string; experienceText: string } {
  return {
    hospitalId: '',
    departmentId: '',
    name: '',
    title: '',
    specialty: '',
    experienceText: '',
    availability: '',
  };
}

export function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<AdminDoctorRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('all');

  const [tree, setTree] = useState<HospitalCatalogItem[] | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyEditorValues());

  // Debounce the search box so typing does not fire a query per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = async (msg?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.getDoctors({
        q: searchQuery || undefined,
        city: cityFilter !== 'all' ? cityFilter : undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setDoctors(result.doctors);
      setTotal(result.total);
      setCities(result.cities);
      if (msg) setNotice({ type: 'success', text: msg });
    } catch (err) {
      setDoctors([]);
      setError(err instanceof Error ? err.message : 'Failed to load doctors.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, cityFilter, searchQuery]);

  const failNotice = (err: unknown) =>
    setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Something went wrong.' });

  const ensureTree = async (): Promise<HospitalCatalogItem[] | null> => {
    if (tree) return tree;
    try {
      const { hospitals } = await adminApi.getHospitals();
      setTree(hospitals);
      return hospitals;
    } catch (err) {
      failNotice(err);
      return null;
    }
  };

  const openAdd = async () => {
    setNotice(null);
    const hospitals = await ensureTree();
    if (!hospitals) return;
    const first = hospitals[0];
    setEditingDoctorId(null);
    setForm({
      ...emptyEditorValues(),
      hospitalId: first?.id ?? '',
      departmentId: first?.departments[0]?.id ?? '',
    });
    setEditorOpen(true);
  };

  const openEdit = async (row: AdminDoctorRow) => {
    setNotice(null);
    const hospitals = await ensureTree();
    if (!hospitals) return;
    setEditingDoctorId(row.id);
    setForm({
      hospitalId: row.hospitalId,
      departmentId: row.departmentId,
      name: row.name,
      title: row.title,
      specialty: row.specialty,
      experienceText: row.experience === null || row.experience === undefined ? '' : String(row.experience),
      availability: row.availability ?? '',
    });
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingDoctorId(null);
  };

  const editorHospital = tree?.find((h) => h.id === form.hospitalId) ?? null;

  const save = async () => {
    if (!form.hospitalId) {
      setNotice({ type: 'error', text: 'Please select a hospital.' });
      return;
    }
    if (!form.departmentId) {
      setNotice({ type: 'error', text: 'Please select a department.' });
      return;
    }
    if (!form.name.trim() || !form.title.trim() || !form.specialty.trim()) {
      setNotice({ type: 'error', text: 'Doctor name, title and specialization are required.' });
      return;
    }
    const experience = form.experienceText.trim();
    setBusy(true);
    setNotice(null);
    const payload: DoctorInput = {
      departmentId: form.departmentId,
      name: form.name,
      title: form.title,
      specialty: form.specialty,
      experience: experience === '' ? null : Number(experience),
      availability: (form.availability ?? '').trim() || null,
    };
    try {
      if (editingDoctorId) {
        const { message } = await adminApi.updateDoctor(form.hospitalId, editingDoctorId, payload);
        closeEditor();
        await load(message);
      } else {
        const { message } = await adminApi.addDoctor(form.hospitalId, payload);
        closeEditor();
        await load(message);
      }
    } catch (err) {
      failNotice(err);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: AdminDoctorRow) => {
    const ok = window.confirm(`Delete doctor "${row.name}" from ${row.hospitalName}?`);
    if (!ok) return;
    setBusy(true);
    setNotice(null);
    try {
      const { message } = await adminApi.deleteDoctor(row.hospitalId, row.id);
      await load(message);
    } catch (err) {
      failNotice(err);
    } finally {
      setBusy(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (doctors === null && loading) {
    return (
      <div className="center-screen" role="status" aria-label="Loading doctors">
        <div className="spinner" />
      </div>
    );
  }

  if (doctors === null && error) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <h1>Doctor Management</h1>
          <div className="alert alert-error">{error}</div>
          <button type="button" className="btn btn-primary btn-block" onClick={() => load()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-hero">
        <h1>Doctor Management</h1>
        <p className="muted">
          Search, edit and remove doctor profiles across all {total} registered doctor listing
          {total === 1 ? '' : 's'}.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && notice.type === 'error' && <div className="alert alert-error">{notice.text}</div>}
      {notice && notice.type === 'success' && <div className="alert alert-success">{notice.text}</div>}

      <div className="admin-toolbar">
        <button type="button" className="btn btn-primary" onClick={openAdd} disabled={busy}>
          + Add doctor
        </button>
      </div>

      <div className="admin-toolbar admin-filters">
        <label className="admin-filter">
          Search
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Doctor, specialty, hospital or department…"
            data-testid="doc-search"
          />
        </label>
        <label className="admin-filter">
          City
          <select
            value={cityFilter}
            onChange={(e) => {
              setCityFilter(e.target.value);
              setPage(1);
            }}
            data-testid="doc-city-filter"
          >
            <option value="all">All cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <span className="muted admin-filter-count" role="status">
          {total} doctor{total === 1 ? '' : 's'} found
        </span>
      </div>

      {editorOpen && (
        <div className="admin-form-card">
          <h3>{editingDoctorId ? 'Edit doctor' : 'Add doctor'}</h3>
          <div className="admin-form-grid">
            <label>
              Hospital *
              <select
                value={form.hospitalId}
                onChange={(e) => {
                  const hospitalId = e.target.value;
                  const hospital = tree?.find((h) => h.id === hospitalId);
                  setForm((f) => ({
                    ...f,
                    hospitalId,
                    departmentId: hospital?.departments[0]?.id ?? '',
                  }));
                }}
                data-testid="doc-hospital"
              >
                {(tree ?? []).map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} — {h.city}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Department *
              <select
                value={form.departmentId}
                onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}
                data-testid="doc-department"
              >
                {(editorHospital?.departments ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Doctor name *
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Dr. Sample Kumar"
                data-testid="doc-name"
              />
            </label>
            <label>
              Title *
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. MD"
                data-testid="doc-title"
              />
            </label>
            <label>
              Specialization *
              <input
                type="text"
                value={form.specialty}
                onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
                placeholder="e.g. Cardiologist"
                data-testid="doc-specialty"
              />
            </label>
            <label>
              Experience (years)
              <input
                type="number"
                min={0}
                max={70}
                value={form.experienceText}
                onChange={(e) => setForm((f) => ({ ...f, experienceText: e.target.value }))}
                placeholder="e.g. 10"
                data-testid="doc-experience"
              />
            </label>
            <label className="admin-form-span">
              Available days / times
              <input
                type="text"
                value={form.availability ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, availability: e.target.value }))}
                placeholder="e.g. Mon-Fri 9:00 AM - 5:00 PM"
                data-testid="doc-availability"
              />
            </label>
          </div>
          <div className="admin-form-actions">
            <button type="button" className="btn btn-outline" onClick={closeEditor} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
              {busy ? 'Saving…' : editingDoctorId ? 'Save changes' : 'Add doctor'}
            </button>
          </div>
        </div>
      )}

      {loading && doctors !== null && <div className="spinner" role="status" aria-label="Loading" />}

      {!loading && doctors !== null && doctors.length === 0 && (
        <div className="alert alert-info" role="status">
          No doctors match the current search or filters.
        </div>
      )}

      {!loading && doctors !== null && doctors.length > 0 && (
        <ul className="appointment-list admin-doctor-list">
          {doctors.map((row) => (
            <li className="appointment-item" key={row.id} data-testid="admin-doctor">
              <div className="appointment-main">
                <div className="appointment-title">
                  <strong>
                    {row.name} {row.isDemo && <span className="badge badge-muted">Demo</span>}
                  </strong>
                  <span className="muted">
                    {row.title} · {row.specialty}
                    {row.experience !== null && row.experience !== undefined
                      ? ` · ${row.experience} yrs`
                      : ''}
                  </span>
                  <span className="muted">
                    {row.departmentName} · {row.hospitalName} ({row.city})
                  </span>
                  {row.availability && (
                    <span className="muted">Available: {row.availability}</span>
                  )}
                </div>
                <div className="hosp-actions">
                  <Link
                    className="btn btn-outline btn-small"
                    to={`/admin/hospitals`}
                    data-testid="doctor-view-hospital"
                  >
                    Hospital
                  </Link>
                  <button
                    type="button"
                    className="btn btn-outline btn-small"
                    onClick={() => openEdit(row)}
                    disabled={busy}
                    data-testid="doctor-edit"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-small"
                    onClick={() => remove(row)}
                    disabled={busy}
                    data-testid="doctor-delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="admin-pagination">
          <button
            type="button"
            className="btn btn-outline btn-small"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            data-testid="doc-page-prev"
          >
            Previous
          </button>
          <span className="muted" role="status">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-outline btn-small"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            data-testid="doc-page-next"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

import { pool } from '../config/database.js';
import type {
  AdminDoctorRow,
  Doctor,
  HospitalCatalogItem,
  HospitalDepartment,
  HospitalRecommendation,
  ServiceLocation,
} from '../types/hospital.js';

interface RecommendationRow {
  id: string;
  name: string;
  city: string;
  district: string | null;
  state: string;
  address: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  availability: string | null;
  hospital_type: string | null;
  department: HospitalDepartment;
  doctors: Doctor[];
  created_at: Date;
}

function toHospitalRecommendation(row: RecommendationRow): HospitalRecommendation {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    district: row.district,
    state: row.state,
    address: row.address,
    phone: row.phone,
    email: row.email,
    website: row.website,
    availability: row.availability,
    hospitalType: row.hospital_type,
    department: row.department,
    doctors: row.doctors,
    createdAt: row.created_at,
  };
}

export async function listHospitalLocations(): Promise<string[]> {
  const result = await pool.query<{ name: string }>(
    `SELECT DISTINCT name FROM (
       SELECT city AS name FROM hospitals
       UNION
       SELECT district AS name FROM hospitals WHERE district IS NOT NULL AND district <> ''
     ) locations
     ORDER BY name`,
  );
  return result.rows.map((row) => row.name);
}

/** The eight selectable service locations, in display order (for the location picker). */
export async function listServiceLocations(): Promise<ServiceLocation[]> {
  const result = await pool.query<{
    id: string;
    city: string;
    district: string;
    state: string;
    latitude: number;
    longitude: number;
    display_order: number;
  }>(
    `SELECT id, city, district, state, latitude, longitude, display_order
     FROM locations
     WHERE is_active = true
     ORDER BY display_order, city`,
  );
  return result.rows.map((row) => ({
    id: row.id,
    city: row.city,
    district: row.district,
    state: row.state,
    latitude: row.latitude,
    longitude: row.longitude,
    displayOrder: row.display_order,
  }));
}

export async function findRecommendedHospitals(
  specialty: string,
  location?: string,
): Promise<HospitalRecommendation[]> {
  const result = await pool.query<RecommendationRow>(
    `SELECT
        h.id,
        h.name,
        h.city,
        h.district,
        h.state,
        h.address,
        h.phone,
        h.email,
        h.website,
        h.availability,
        h.hospital_type,
        h.created_at,
        json_build_object('id', d.id, 'name', d.name, 'description', d.description) AS department,
        COALESCE(
          json_agg(
            json_build_object(
              'id', doc.id,
              'name', doc.name,
              'title', doc.title,
              'specialty', doc.specialty,
              'experience', doc.experience,
              'availability', doc.availability,
              'isDemo', doc.is_demo
            ) ORDER BY doc.name
          ) FILTER (WHERE doc.id IS NOT NULL),
          '[]'
        ) AS doctors
      FROM hospitals h
      JOIN hospital_departments d
        ON d.hospital_id = h.id
        AND d.name ILIKE '%' || $1 || '%'
      LEFT JOIN doctors doc
        ON doc.department_id = d.id
      WHERE h.state = 'Tamil Nadu'
        AND ($2::text IS NULL OR h.city ILIKE $2 OR h.district ILIKE $2)
      GROUP BY h.id, d.id
      ORDER BY h.city, h.name`,
    [specialty, location ?? null],
  );

  return result.rows.map(toHospitalRecommendation);
}

interface HospitalTreeRow {
  id: string;
  name: string;
  city: string;
  district: string | null;
  state: string;
  address: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  availability: string | null;
  hospital_type: string | null;
  departments: unknown;
  created_at: Date;
}

function toCatalogItem(row: HospitalTreeRow): HospitalCatalogItem {
  const departments = Array.isArray(row.departments)
    ? (row.departments as HospitalCatalogItem['departments'])
    : [];
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    district: row.district,
    state: row.state,
    address: row.address,
    phone: row.phone,
    email: row.email,
    website: row.website,
    availability: row.availability,
    hospitalType: row.hospital_type,
    departments,
    createdAt: row.created_at,
  };
}

async function queryHospitalTree(where: string, params: unknown[]): Promise<HospitalCatalogItem[]> {
  const result = await pool.query<HospitalTreeRow>(
    `WITH dept_doctors AS (
       SELECT
         d.id AS department_id,
         COALESCE(
           json_agg(
             json_build_object(
                'id', doc.id,
                'name', doc.name,
                'title', doc.title,
                'specialty', doc.specialty,
                'experience', doc.experience,
                'availability', doc.availability,
                'isDemo', doc.is_demo
              ) ORDER BY doc.name
           ) FILTER (WHERE doc.id IS NOT NULL),
           '[]'
         ) AS doctors
       FROM hospital_departments d
       LEFT JOIN doctors doc ON doc.department_id = d.id
       GROUP BY d.id
     )
     SELECT
       h.id,
       h.name,
       h.city,
       h.district,
       h.state,
       h.address,
       h.phone,
       h.email,
        h.website,
        h.availability,
        h.hospital_type,
        h.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', d.id,
              'name', d.name,
              'description', d.description,
              'doctors', dd.doctors
            ) ORDER BY d.name
          ) FILTER (WHERE d.id IS NOT NULL),
          '[]'
        ) AS departments
      FROM hospitals h
      LEFT JOIN hospital_departments d ON d.hospital_id = h.id
      LEFT JOIN dept_doctors dd ON dd.department_id = d.id
      WHERE ${where}
      GROUP BY h.id, h.name, h.city, h.district, h.state, h.address, h.phone, h.email, h.website, h.availability, h.hospital_type, h.created_at
      ORDER BY h.city, h.name`,
    params,
  );
  return result.rows.map(toCatalogItem);
}

/**
 * Patient-facing catalog: only Tamil Nadu hospitals, optionally filtered by a
 * selected city or district.
 */
export async function listHospitalCatalog(location?: string): Promise<HospitalCatalogItem[]> {
  const hasLocation = Boolean(location && location.trim());
  const where = hasLocation
    ? "h.state = 'Tamil Nadu' AND ($1::text IS NULL OR h.city ILIKE $1 OR h.district ILIKE $1)"
    : "h.state = 'Tamil Nadu'";
  return queryHospitalTree(where, hasLocation ? [location!.trim()] : []);
}

async function findHospitalTreeById(id: string): Promise<HospitalCatalogItem | null> {
  const list = await queryHospitalTree('h.id = $1', [id]);
  return list[0] ?? null;
}

// ---------------------------------------------------------------------------
// Admin management
// ---------------------------------------------------------------------------

export interface HospitalInput {
  name: string;
  city: string;
  district: string | null;
  state: string;
  address: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  availability: string | null;
  hospitalType: string | null;
}

export async function listAllHospitalsForAdmin(): Promise<HospitalCatalogItem[]> {
  return queryHospitalTree('TRUE', []);
}

export async function findHospitalById(id: string): Promise<HospitalCatalogItem | null> {
  return findHospitalTreeById(id);
}

export async function createHospital(data: HospitalInput): Promise<HospitalCatalogItem> {
  const insert = await pool.query<{ id: string }>(
    `INSERT INTO hospitals (name, city, district, state, address, phone, email, website, availability, hospital_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      data.name,
      data.city,
      data.district,
      data.state,
      data.address,
      data.phone,
      data.email,
      data.website,
      data.availability,
      data.hospitalType,
    ],
  );
  const created = await findHospitalTreeById(insert.rows[0].id);
  if (!created) throw new Error('Hospital was created but could not be loaded.');
  return created;
}

export async function updateHospital(
  id: string,
  data: HospitalInput,
): Promise<HospitalCatalogItem | null> {
  const update = await pool.query<{ id: string }>(
    `UPDATE hospitals
     SET name = $2, city = $3, district = $4, state = $5, address = $6,
         phone = $7, email = $8, website = $9, availability = $10, hospital_type = $11
     WHERE id = $1
     RETURNING id`,
    [
      id,
      data.name,
      data.city,
      data.district,
      data.state,
      data.address,
      data.phone,
      data.email,
      data.website,
      data.availability,
      data.hospitalType,
    ],
  );
  if (update.rows.length === 0) return null;
  return findHospitalTreeById(id);
}

export async function deleteHospital(id: string): Promise<boolean> {
  const result = await pool.query<{ id: string }>(
    'DELETE FROM hospitals WHERE id = $1 RETURNING id',
    [id],
  );
  return result.rows.length > 0;
}

export async function createDepartment(
  hospitalId: string,
  data: { name: string; description: string | null },
): Promise<HospitalDepartment> {
  const result = await pool.query<HospitalDepartment>(
    `INSERT INTO hospital_departments (hospital_id, name, description)
     VALUES ($1, $2, $3)
     RETURNING id, name, description`,
    [hospitalId, data.name, data.description],
  );
  return result.rows[0];
}

export async function updateDepartment(
  hospitalId: string,
  id: string,
  data: { name: string; description: string | null },
): Promise<HospitalDepartment | null> {
  const result = await pool.query<HospitalDepartment>(
    `UPDATE hospital_departments
     SET name = $3, description = $4
     WHERE id = $1 AND hospital_id = $2
     RETURNING id, name, description`,
    [id, hospitalId, data.name, data.description],
  );
  return result.rows[0] ?? null;
}

export async function deleteDepartment(hospitalId: string, id: string): Promise<boolean> {
  const result = await pool.query<{ id: string }>(
    'DELETE FROM hospital_departments WHERE id = $1 AND hospital_id = $2 RETURNING id',
    [id, hospitalId],
  );
  return result.rows.length > 0;
}

export interface DoctorInput {
  hospitalId: string;
  departmentId: string;
  name: string;
  title: string;
  specialty: string;
  experience: number | null;
  availability: string | null;
}

export async function createDoctor(data: DoctorInput): Promise<Doctor> {
  const result = await pool.query<Doctor>(
    `INSERT INTO doctors (hospital_id, department_id, name, title, specialty, experience, availability, is_demo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, false)
     RETURNING id, name, title, specialty, experience, availability, is_demo AS "isDemo"`,
    [
      data.hospitalId,
      data.departmentId,
      data.name,
      data.title,
      data.specialty,
      data.experience,
      data.availability,
    ],
  );
  return result.rows[0];
}

export async function updateDoctor(id: string, data: DoctorInput): Promise<Doctor | null> {
  const result = await pool.query<Doctor>(
    `UPDATE doctors
     SET hospital_id = $2, department_id = $3, name = $4, title = $5,
         specialty = $6, experience = $7, availability = $8
     WHERE id = $1
     RETURNING id, name, title, specialty, experience, availability, is_demo AS "isDemo"`,
    [
      id,
      data.hospitalId,
      data.departmentId,
      data.name,
      data.title,
      data.specialty,
      data.experience,
      data.availability,
    ],
  );
  return result.rows[0] ?? null;
}

export async function deleteDoctor(id: string): Promise<boolean> {
  const result = await pool.query<{ id: string }>(
    'DELETE FROM doctors WHERE id = $1 RETURNING id',
    [id],
  );
  return result.rows.length > 0;
}

export async function countHospitalAppointments(hospitalId: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    'SELECT count(*)::text AS count FROM appointments WHERE hospital_id = $1',
    [hospitalId],
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function countDepartmentAppointments(departmentId: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    'SELECT count(*)::text AS count FROM appointments WHERE department_id = $1',
    [departmentId],
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function countDoctorAppointments(doctorId: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    'SELECT count(*)::text AS count FROM appointments WHERE doctor_id = $1',
    [doctorId],
  );
  return Number(result.rows[0]?.count ?? 0);
}

/** Cheap targeted existence checks (avoids loading the full hospital tree). */
export async function hospitalExists(id: string): Promise<boolean> {
  const result = await pool.query<{ id: string }>(
    'SELECT id FROM hospitals WHERE id = $1',
    [id],
  );
  return result.rows.length > 0;
}

export async function departmentExists(hospitalId: string, departmentId: string): Promise<boolean> {
  const result = await pool.query<{ id: string }>(
    'SELECT id FROM hospital_departments WHERE id = $1 AND hospital_id = $2',
    [departmentId, hospitalId],
  );
  return result.rows.length > 0;
}

/**
 * Flat, paginated doctor directory for the admin doctors page (100 hospitals
 * hold ~1400 doctors, so this endpoint never returns the whole list at once).
 */
export interface AdminDoctorQuery {
  q?: string;
  city?: string;
  page: number;
  pageSize: number;
}

export async function listDoctorsForAdmin(
  query: AdminDoctorQuery,
): Promise<{ rows: AdminDoctorRow[]; total: number }> {
  const params: unknown[] = [];
  const where: string[] = [];

  if (query.q && query.q.trim()) {
    params.push(`%${query.q.trim()}%`);
    where.push(
      `(doc.name ILIKE $${params.length} OR doc.specialty ILIKE $${params.length}
        OR h.name ILIKE $${params.length} OR d.name ILIKE $${params.length})`,
    );
  }
  if (query.city && query.city.trim()) {
    params.push(query.city.trim());
    where.push('(h.city ILIKE $' + params.length + ' OR h.district ILIKE $' + params.length + ')');
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const countResult = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count
     FROM doctors doc
     JOIN hospitals h ON h.id = doc.hospital_id
     JOIN hospital_departments d ON d.id = doc.department_id
     ${whereSql}`,
    params,
  );
  const total = Number(countResult.rows[0]?.count ?? 0);

  params.push(query.pageSize);
  const limitIndex = params.length;
  params.push((query.page - 1) * query.pageSize);
  const offsetIndex = params.length;

  const result = await pool.query<{
    id: string;
    name: string;
    title: string;
    specialty: string;
    experience: number | null;
    availability: string | null;
    is_demo: boolean | null;
    hospital_id: string;
    hospital_name: string;
    city: string;
    department_id: string;
    department_name: string;
  }>(
    `SELECT
       doc.id, doc.name, doc.title, doc.specialty, doc.experience,
       doc.availability, doc.is_demo,
       h.id AS hospital_id, h.name AS hospital_name, h.city,
       d.id AS department_id, d.name AS department_name
     FROM doctors doc
     JOIN hospitals h ON h.id = doc.hospital_id
     JOIN hospital_departments d ON d.id = doc.department_id
     ${whereSql}
     ORDER BY h.city, h.name, d.name, doc.name
     LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    params,
  );

  return {
    total,
    rows: result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      title: row.title,
      specialty: row.specialty,
      experience: row.experience,
      availability: row.availability,
      isDemo: row.is_demo,
      hospitalId: row.hospital_id,
      hospitalName: row.hospital_name,
      city: row.city,
      departmentId: row.department_id,
      departmentName: row.department_name,
    })),
  };
}
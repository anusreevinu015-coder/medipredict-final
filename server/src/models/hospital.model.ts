import { pool } from '../config/database.js';
import type {
  Doctor,
  HospitalCatalogItem,
  HospitalDepartment,
  HospitalRecommendation,
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
              'availability', doc.availability
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
               'availability', doc.availability
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
     GROUP BY h.id, h.name, h.city, h.district, h.state, h.address, h.phone, h.email, h.website, h.availability, h.created_at
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
}

export async function listAllHospitalsForAdmin(): Promise<HospitalCatalogItem[]> {
  return queryHospitalTree('TRUE', []);
}

export async function findHospitalById(id: string): Promise<HospitalCatalogItem | null> {
  return findHospitalTreeById(id);
}

export async function createHospital(data: HospitalInput): Promise<HospitalCatalogItem> {
  const insert = await pool.query<{ id: string }>(
    `INSERT INTO hospitals (name, city, district, state, address, phone, email, website, availability)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
         phone = $7, email = $8, website = $9, availability = $10
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
    `INSERT INTO doctors (hospital_id, department_id, name, title, specialty, experience, availability)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, name, title, specialty, experience, availability`,
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
     RETURNING id, name, title, specialty, experience, availability`,
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
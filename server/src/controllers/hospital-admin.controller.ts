import { z } from 'zod';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware.js';
import {
  countDepartmentAppointments,
  countDoctorAppointments,
  countHospitalAppointments,
  createDepartment,
  createDoctor,
  createHospital,
  deleteDepartment,
  deleteDoctor,
  deleteHospital,
  listAllHospitalsForAdmin,
  listHospitalLocations,
  updateDepartment,
  updateDoctor,
  updateHospital,
} from '../models/hospital.model.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const optionalText = (max: number) =>
  z.string().trim().max(max, `Value is too long (max ${max} characters).`).nullable().optional();

const hospitalSchema = z.object({
  name: z.string().trim().min(1, 'Hospital name is required.').max(200, 'Hospital name is too long.'),
  city: z.string().trim().min(1, 'City is required.').max(100, 'City is too long.'),
  district: optionalText(100),
  state: z.string().trim().min(1, 'State is required.').max(100).default('Tamil Nadu'),
  address: z.string().trim().min(1, 'Address is required.').max(300, 'Address is too long.'),
  phone: optionalText(50),
  email: optionalText(200),
  website: optionalText(200),
  availability: optionalText(500),
});

const departmentSchema = z.object({
  name: z.string().trim().min(1, 'Department name is required.').max(100, 'Department name is too long.'),
  description: optionalText(300),
});

const doctorSchema = z.object({
  departmentId: z.string().regex(UUID_PATTERN, 'Please select a valid department.'),
  name: z.string().trim().min(1, 'Doctor name is required.').max(200, 'Doctor name is too long.'),
  title: z.string().trim().min(1, 'Title is required.').max(100, 'Title is too long.'),
  specialty: z.string().trim().min(1, 'Specialization is required.').max(200, 'Specialization is too long.'),
  experience: z.coerce.number().int().min(0).max(70).nullable().optional(),
  availability: optionalText(500),
});

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}

function uniqueMessage(field: string): string {
  return `A hospital with this ${field} already exists.`;
}

export const listHospitalsAdmin = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const hospitals = await listAllHospitalsForAdmin();
  const locations = await listHospitalLocations();
  res.status(200).json({ hospitals, cities: locations });
});

export const addHospital = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const parsed = hospitalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  try {
    const hospital = await createHospital({
      name: parsed.data.name,
      city: parsed.data.city,
      district: parsed.data.district ?? null,
      state: parsed.data.state,
      address: parsed.data.address,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? null,
      website: parsed.data.website ?? null,
      availability: parsed.data.availability ?? null,
    });
    res.status(201).json({ hospital, message: 'Hospital added successfully.' });
  } catch (err) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ message: uniqueMessage('name and city') });
      return;
    }
    throw err;
  }
});

export const editHospital = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const parsed = hospitalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  try {
    const hospital = await updateHospital(req.params.id ?? '', {
      name: parsed.data.name,
      city: parsed.data.city,
      district: parsed.data.district ?? null,
      state: parsed.data.state,
      address: parsed.data.address,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? null,
      website: parsed.data.website ?? null,
      availability: parsed.data.availability ?? null,
    });
    if (!hospital) {
      res.status(404).json({ message: 'Hospital not found.' });
      return;
    }
    res.status(200).json({ hospital, message: 'Hospital updated successfully.' });
  } catch (err) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ message: uniqueMessage('name and city') });
      return;
    }
    throw err;
  }
});

export const removeHospital = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const hospitalId = req.params.id ?? '';
  const bookings = await countHospitalAppointments(hospitalId);
  if (bookings > 0) {
    res.status(409).json({
      message: `This hospital has ${bookings} appointment(s). De-list appointments first or reject them before deleting the hospital.`,
    });
    return;
  }
  const deleted = await deleteHospital(hospitalId);
  if (!deleted) {
    res.status(404).json({ message: 'Hospital not found.' });
    return;
  }
  res.status(200).json({ message: 'Hospital deleted successfully.' });
});

export const addDepartment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const parsed = departmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  const hospitalId = req.params.id ?? '';
  const exists = await listAllHospitalsForAdmin();
  if (!exists.some((h) => h.id === hospitalId)) {
    res.status(404).json({ message: 'Hospital not found.' });
    return;
  }

  try {
    const department = await createDepartment(hospitalId, {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    });
    res.status(201).json({ department, message: 'Department added successfully.' });
  } catch (err) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ message: 'This hospital already has a department with that name.' });
      return;
    }
    throw err;
  }
});

export const editDepartment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const parsed = departmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  try {
    const department = await updateDepartment(req.params.id ?? '', req.params.departmentId ?? '', {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    });
    if (!department) {
      res.status(404).json({ message: 'Department not found.' });
      return;
    }
    res.status(200).json({ department, message: 'Department updated successfully.' });
  } catch (err) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ message: 'This hospital already has a department with that name.' });
      return;
    }
    throw err;
  }
});

export const removeDepartment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const departmentId = req.params.departmentId ?? '';
  const bookings = await countDepartmentAppointments(departmentId);
  if (bookings > 0) {
    res.status(409).json({
      message: `This department has ${bookings} appointment(s). De-list or reject them before deleting the department.`,
    });
    return;
  }
  const deleted = await deleteDepartment(req.params.id ?? '', departmentId);
  if (!deleted) {
    res.status(404).json({ message: 'Department not found.' });
    return;
  }
  res.status(200).json({ message: 'Department deleted successfully.' });
});

export const addDoctor = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const parsed = doctorSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  const hospitalId = req.params.id ?? '';
  const departmentId = parsed.data.departmentId;

  const hospitals = await listAllHospitalsForAdmin();
  const hospital = hospitals.find((h) => h.id === hospitalId);
  if (!hospital) {
    res.status(404).json({ message: 'Hospital not found.' });
    return;
  }
  if (!hospital.departments.some((d) => d.id === departmentId)) {
    res.status(400).json({ message: 'The department does not belong to this hospital.' });
    return;
  }

  try {
    const doctor = await createDoctor({
      hospitalId,
      departmentId,
      name: parsed.data.name,
      title: parsed.data.title,
      specialty: parsed.data.specialty,
      experience: parsed.data.experience ?? null,
      availability: parsed.data.availability ?? null,
    });
    res.status(201).json({
      doctor,
      message: 'Doctor added successfully.',
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ message: 'This doctor is already listed in this department of the hospital.' });
      return;
    }
    throw err;
  }
});

export const editDoctor = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const parsed = doctorSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  const hospitalId = req.params.id ?? '';
  const departmentId = parsed.data.departmentId;
  const hospitals = await listAllHospitalsForAdmin();
  const hospital = hospitals.find((h) => h.id === hospitalId);
  if (!hospital) {
    res.status(404).json({ message: 'Hospital not found.' });
    return;
  }
  if (!hospital.departments.some((d) => d.id === departmentId)) {
    res.status(400).json({ message: 'The department does not belong to this hospital.' });
    return;
  }

  try {
    const doctor = await updateDoctor(req.params.doctorId ?? '', {
      hospitalId,
      departmentId,
      name: parsed.data.name,
      title: parsed.data.title,
      specialty: parsed.data.specialty,
      experience: parsed.data.experience ?? null,
      availability: parsed.data.availability ?? null,
    });
    if (!doctor) {
      res.status(404).json({ message: 'Doctor not found.' });
      return;
    }
    res.status(200).json({ doctor, message: 'Doctor updated successfully.' });
  } catch (err) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ message: 'This doctor is already listed in this department of the hospital.' });
      return;
    }
    throw err;
  }
});

export const removeDoctor = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const doctorId = req.params.doctorId ?? '';
  const bookings = await countDoctorAppointments(doctorId);
  if (bookings > 0) {
    res.status(409).json({
      message: `This doctor has ${bookings} appointment(s). De-list or reject them before deleting the doctor.`,
    });
    return;
  }
  const deleted = await deleteDoctor(doctorId);
  if (!deleted) {
    res.status(404).json({ message: 'Doctor not found.' });
    return;
  }
  res.status(200).json({ message: 'Doctor deleted successfully.' });
});
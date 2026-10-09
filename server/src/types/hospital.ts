export interface Doctor {
  id: string;
  name: string;
  title: string;
  specialty: string;
  experience: number | null;
  availability: string | null;
  /** true for seeded synthetic demo profiles; NULL means "unknown / pre-existing". */
  isDemo: boolean | null;
}

export interface HospitalDepartment {
  id: string;
  name: string;
  description: string | null;
}

export interface HospitalBase {
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
  hospitalType: string | null;
  createdAt: Date;
}

export interface HospitalRecommendation extends HospitalBase {
  department: HospitalDepartment;
  doctors: Doctor[];
}

export interface HospitalDepartmentWithDoctors extends HospitalDepartment {
  doctors: Doctor[];
}

export interface HospitalCatalogItem extends HospitalBase {
  departments: HospitalDepartmentWithDoctors[];
}

/** One of the eight service locations the patient can choose from. */
export interface ServiceLocation {
  id: string;
  city: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  displayOrder: number;
}

/** Flat doctor row for the admin doctor directory (hospital + department joined in). */
export interface AdminDoctorRow {
  id: string;
  name: string;
  title: string;
  specialty: string;
  experience: number | null;
  availability: string | null;
  isDemo: boolean | null;
  hospitalId: string;
  hospitalName: string;
  city: string;
  departmentId: string;
  departmentName: string;
}

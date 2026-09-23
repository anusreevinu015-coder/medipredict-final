export interface Doctor {
  id: string;
  name: string;
  title: string;
  specialty: string;
  experience: number | null;
  availability: string | null;
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
export interface ClinicDirectoryItem {
  clinicId: string;
  name: string;
  address: string;
  phone: string | null;
  contactEmail: string | null;
}

export interface ClinicDirectoryPage {
  page: number;
  pageSize: number;
  totalCount: number;
  items: ClinicDirectoryItem[];
}

export interface OpeningHours {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
}

export interface ClinicProfile extends ClinicDirectoryItem {
  openingHours: OpeningHours[];
  updatedAt: string;
}

export interface ClinicVeterinarian {
  veterinarianId: string;
}

export type UpdateClinicProfile = Pick<
  ClinicProfile,
  'name' | 'address' | 'phone' | 'contactEmail' | 'openingHours'
>;

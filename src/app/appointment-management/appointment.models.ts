export interface ClinicDirectoryItem {
  clinicId: string;
  name: string;
  address: string;
}

export interface ClinicDirectoryPage {
  items: ClinicDirectoryItem[];
}

export interface AgendaAppointment {
  appointmentId: string;
  petId: string;
  petName: string | null;
  species: string | null;
  clinicId: string;
  veterinarianId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  status: string;
  clinicalAttentionId: string | null;
}

export interface AppointmentAgenda {
  clinicId: string;
  from: string;
  to: string;
  appointments: AgendaAppointment[];
}

export interface AppointmentDetail extends AgendaAppointment {
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RescheduleAppointment {
  operation: 'reschedule';
  date: string;
  startTime: string;
}

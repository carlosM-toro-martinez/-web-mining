import { SyncStatus } from "@prisma/client";

export interface CreateEmployeeInput {
  nombre: string;
  documento?: string | null;
  deviceUserId: string;
}

export interface UpdateEmployeeInput {
  nombre?: string;
  documento?: string | null;
  deviceUserId?: string;
  activo?: boolean;
}

export interface EmployeeResponse {
  id: number;
  nombre: string;
  documento: string | null;
  deviceUserId: string;
  activo: boolean;
  syncStatus: SyncStatus;
  createdAt: Date;
  updatedAt: Date;
}

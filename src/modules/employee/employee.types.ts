import type { SyncStatus, TipoPersonal } from "@prisma/client";

export interface CreateEmployeeInput {
  nombre: string;
  documento?: string | null | undefined;
  cargo?: string | null | undefined;
  tipoPersonal?: TipoPersonal | undefined;
  deviceUserId?: string | undefined;
}

export interface UpdateEmployeeInput {
  nombre?: string | undefined;
  documento?: string | null | undefined;
  cargo?: string | null | undefined;
  tipoPersonal?: TipoPersonal | undefined;
  activo?: boolean | undefined;
}

export interface EmployeeResponse {
  id: number;
  nombre: string;
  documento: string | null;
  cargo: string | null;
  tipoPersonal: TipoPersonal;
  deviceUserId: string;
  activo: boolean;
  syncStatus: SyncStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeQuery {
  search?: string | undefined;
  activo?: boolean | undefined;
  tipoPersonal?: TipoPersonal | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

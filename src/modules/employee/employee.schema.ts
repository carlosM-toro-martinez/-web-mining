import { z } from "zod";

export const createEmployeeSchema = z.object({
  nombre: z.string().min(1).max(100),
  documento: z.string().min(1).max(50).nullable().optional(),
  cargo: z.string().min(1).max(100).nullable().optional(),
  deviceUserId: z.string().min(1).max(20).optional(),
});

export const updateEmployeeSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  documento: z.string().min(1).max(50).nullable().optional(),
  cargo: z.string().min(1).max(100).nullable().optional(),
  activo: z.boolean().optional(),
});

export const employeeQuerySchema = z.object({
  search: z.string().optional(),
  activo: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const employeeIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

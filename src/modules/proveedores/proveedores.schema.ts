import { z } from "zod";

export const createProveedorSchema = z
  .object({
    nombre: z.string().min(1),
    razonSocial: z.string().optional(),
    nit: z.string().optional(),
    lugar: z.string().optional(),
    contacto: z.string().optional(),
  })
  .strict();

export const updateProveedorSchema = z
  .object({
    nombre: z.string().min(1).optional(),
    razonSocial: z.string().optional(),
    nit: z.string().optional(),
    lugar: z.string().optional(),
    contacto: z.string().optional(),
  })
  .strict();

export const proveedorQuerySchema = z
  .object({
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
    search: z.string().optional(),
  })
  .strict();

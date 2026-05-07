import { z } from "zod";

export const binCardQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 50)),
  productoId: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : undefined)),
  fechaInicio: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  fechaFin: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  fecha: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
});

export type BinCardQueryDTO = z.infer<typeof binCardQuerySchema>;

export interface BinCardItem {
  id: string;
  operationId: string;
  fecha: Date;
  tipo: "ENTRADA" | "SALIDA";
  cantidad: number;
  stockAntes: number;
  stockDespues: number;
  usuarioNombre: string;
  referencia: string | null;
  referenciaId: string | null;
  productoNombre: string;
}

export interface BinCardValoradoItem extends BinCardItem {
  precioUnit: number;
  entradaBs: number;
  salidaBs: number;
  saldoBs: number;
}

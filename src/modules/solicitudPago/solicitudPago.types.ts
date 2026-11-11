import type { z } from "zod";
import type {
  anularSolicitudSchema,
  createSolicitudSchema,
  entregaSolicitudSchema,
  facturaSolicitudSchema,
  pagarSolicitudSchema,
  solicitudQuerySchema,
  updateSolicitudSchema,
} from "./solicitudPago.schema.js";

export type CreateSolicitudDTO = z.infer<typeof createSolicitudSchema>;
export type UpdateSolicitudDTO = z.infer<typeof updateSolicitudSchema>;
export type FacturaSolicitudDTO = z.infer<typeof facturaSolicitudSchema>;
export type EntregaSolicitudDTO = z.infer<typeof entregaSolicitudSchema>;
export type PagarSolicitudDTO = z.infer<typeof pagarSolicitudSchema>;
export type AnularSolicitudDTO = z.infer<typeof anularSolicitudSchema>;
export type SolicitudQueryDTO = z.infer<typeof solicitudQuerySchema>;
export type TipoFirma = "ELABORADO" | "REVISADO" | "VISTO_BUENO" | "ADMINISTRADOR";

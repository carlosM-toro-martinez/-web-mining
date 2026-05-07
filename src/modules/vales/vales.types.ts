import type { z } from "zod";
import type {
  createValeSchema,
  aprobarValeSchema,
  entregarValeSchema,
  valeQuerySchema,
} from "./vales.schema.js";

export type CreateValeDTO = z.infer<typeof createValeSchema>;
export type AprobarValeDTO = z.infer<typeof aprobarValeSchema>;
export type EntregarValeDTO = z.infer<typeof entregarValeSchema>;
export type ValeQueryDTO = z.infer<typeof valeQuerySchema>;

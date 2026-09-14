import type { z } from "zod";
import type { reporteCajaChicaQuerySchema } from "./reportesCajaChica.schema.js";

export type ReporteCajaChicaQuery = z.infer<typeof reporteCajaChicaQuerySchema>;

import type { z } from "zod";
import type { createAlicuotaRegaliaSchema } from "./alicuotaRegalia.schema.js";

export type CreateAlicuotaRegaliaDTO = z.infer<typeof createAlicuotaRegaliaSchema>;

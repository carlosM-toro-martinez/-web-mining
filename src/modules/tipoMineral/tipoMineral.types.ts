import type { z } from "zod";
import type { createTipoMineralSchema, updateTipoMineralSchema } from "./tipoMineral.schema.js";

export type CreateTipoMineralDTO = z.infer<typeof createTipoMineralSchema>;
export type UpdateTipoMineralDTO = z.infer<typeof updateTipoMineralSchema>;

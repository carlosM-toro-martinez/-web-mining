import type { z } from "zod";
<<<<<<< HEAD
import type { createSalidaSchema, createEntradaSchema } from "./movimiento.schema.js";

export type CreateSalidaDTO = z.infer<typeof createSalidaSchema>;
export type CreateEntradaDTO = z.infer<typeof createEntradaSchema>;
=======
import type { createSalidaSchema } from "./movimiento.schema.js";

export type CreateSalidaDTO = z.infer<typeof createSalidaSchema>;

>>>>>>> be7654ce96cde142b1a747ccc1ee99fabacfb3cd

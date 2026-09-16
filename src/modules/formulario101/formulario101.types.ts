import type { z } from "zod";
import type {
  anularFormulario101Schema,
  reutilizarFormulario101Schema,
  vincularFormulario101Schema,
} from "./formulario101.schema.js";

export type VincularFormulario101DTO = z.infer<typeof vincularFormulario101Schema>;
export type ReutilizarFormulario101DTO = z.infer<typeof reutilizarFormulario101Schema>;
export type AnularFormulario101DTO = z.infer<typeof anularFormulario101Schema>;

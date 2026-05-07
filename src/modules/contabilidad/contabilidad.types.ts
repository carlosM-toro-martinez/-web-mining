import type { z } from "zod";
import type {
  createCentroCostoSchema,
  updateCentroCostoSchema,
  createFuncionGastoSchema,
  updateFuncionGastoSchema,
  createCuentaContableSchema,
  updateCuentaContableSchema,
<<<<<<< HEAD
  createSectorSchema,
  updateSectorSchema,
=======
>>>>>>> be7654ce96cde142b1a747ccc1ee99fabacfb3cd
} from "./contabilidad.schema.js";

export type CreateCentroCostoDTO = z.infer<typeof createCentroCostoSchema>;
export type UpdateCentroCostoDTO = z.infer<typeof updateCentroCostoSchema>;

export type CreateFuncionGastoDTO = z.infer<typeof createFuncionGastoSchema>;
export type UpdateFuncionGastoDTO = z.infer<typeof updateFuncionGastoSchema>;

export type CreateCuentaContableDTO = z.infer<typeof createCuentaContableSchema>;
export type UpdateCuentaContableDTO = z.infer<typeof updateCuentaContableSchema>;
<<<<<<< HEAD
export type CreateSectorDTO = z.infer<typeof createSectorSchema>;
export type UpdateSectorDTO = z.infer<typeof updateSectorSchema>;
=======

>>>>>>> be7654ce96cde142b1a747ccc1ee99fabacfb3cd

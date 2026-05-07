import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { contabilidadController } from "./contabilidad.controller.js";
import {
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

const idSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const validateParams = (schema: any) => (req: any, res: any, next: any) => {
  const result = schema.safeParse(req.params);
  if (!result.success) {
    return res
      .status(400)
      .json({ success: false, error: "Params validation error", details: result.error.flatten() });
  }
  next();
};

const router = Router();
router.use(authenticate);

router.get("/centros-costo", contabilidadController.getCentrosCosto);
<<<<<<< HEAD
router.get(
  "/centros-costo/:id",
  validateParams(idSchema),
  contabilidadController.getCentroCostoById,
);
=======
router.get("/centros-costo/:id", validateParams(idSchema), contabilidadController.getCentroCostoById);
>>>>>>> be7654ce96cde142b1a747ccc1ee99fabacfb3cd
router.post(
  "/centros-costo",
  authorize("ADMIN", "ALMACENERO"),
  validate(createCentroCostoSchema),
  contabilidadController.createCentroCosto,
);
router.put(
  "/centros-costo/:id",
  authorize("ADMIN", "ALMACENERO"),
  validateParams(idSchema),
  validate(updateCentroCostoSchema),
  contabilidadController.updateCentroCosto,
);
router.delete(
  "/centros-costo/:id",
  authorize("ADMIN"),
  validateParams(idSchema),
  contabilidadController.deleteCentroCosto,
);

router.get("/funciones-gasto", contabilidadController.getFuncionesGasto);
router.get(
  "/funciones-gasto/:id",
  validateParams(idSchema),
  contabilidadController.getFuncionGastoById,
);
router.post(
  "/funciones-gasto",
  authorize("ADMIN", "ALMACENERO"),
  validate(createFuncionGastoSchema),
  contabilidadController.createFuncionGasto,
);
router.put(
  "/funciones-gasto/:id",
  authorize("ADMIN", "ALMACENERO"),
  validateParams(idSchema),
  validate(updateFuncionGastoSchema),
  contabilidadController.updateFuncionGasto,
);
router.delete(
  "/funciones-gasto/:id",
  authorize("ADMIN"),
  validateParams(idSchema),
  contabilidadController.deleteFuncionGasto,
);

<<<<<<< HEAD
router.get("/sectores", contabilidadController.getSectores);
router.get("/sectores/:id", validateParams(idSchema), contabilidadController.getSectorById);
router.post(
  "/sectores",
  authorize("ADMIN", "ALMACENERO"),
  validate(createSectorSchema),
  contabilidadController.createSector,
);
router.put(
  "/sectores/:id",
  authorize("ADMIN", "ALMACENERO"),
  validateParams(idSchema),
  validate(updateSectorSchema),
  contabilidadController.updateSector,
);
router.delete(
  "/sectores/:id",
  authorize("ADMIN"),
  validateParams(idSchema),
  contabilidadController.deleteSector,
);

router.get("/cuentas", contabilidadController.getCuentasContables);
router.get("/cuentas-contables", contabilidadController.getCuentasContables);
router.get("/cuentas/:id", validateParams(idSchema), contabilidadController.getCuentaContableById);
=======
router.get("/cuentas", contabilidadController.getCuentasContables);
router.get("/cuentas-contables", contabilidadController.getCuentasContables);
router.get(
  "/cuentas/:id",
  validateParams(idSchema),
  contabilidadController.getCuentaContableById,
);
>>>>>>> be7654ce96cde142b1a747ccc1ee99fabacfb3cd
router.get(
  "/cuentas-contables/:id",
  validateParams(idSchema),
  contabilidadController.getCuentaContableById,
);
router.post(
  "/cuentas",
  authorize("ADMIN", "ALMACENERO"),
  validate(createCuentaContableSchema),
  contabilidadController.createCuentaContable,
);
router.post(
  "/cuentas-contables",
  authorize("ADMIN", "ALMACENERO"),
  validate(createCuentaContableSchema),
  contabilidadController.createCuentaContable,
);
router.put(
  "/cuentas/:id",
  authorize("ADMIN", "ALMACENERO"),
  validateParams(idSchema),
  validate(updateCuentaContableSchema),
  contabilidadController.updateCuentaContable,
);
router.put(
  "/cuentas-contables/:id",
  authorize("ADMIN", "ALMACENERO"),
  validateParams(idSchema),
  validate(updateCuentaContableSchema),
  contabilidadController.updateCuentaContable,
);
router.delete(
  "/cuentas/:id",
  authorize("ADMIN"),
  validateParams(idSchema),
  contabilidadController.deleteCuentaContable,
);
router.delete(
  "/cuentas-contables/:id",
  authorize("ADMIN"),
  validateParams(idSchema),
  contabilidadController.deleteCuentaContable,
);

export default router;

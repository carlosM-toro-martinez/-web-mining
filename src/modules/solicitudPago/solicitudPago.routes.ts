import { Router } from "express";
import type { NextFunction, Response } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { requirePermiso } from "../../middleware/permiso.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { ROL_SUPERADMIN } from "../roles/permisos.catalogo.js";
import { obtenerPermisosUsuario, tienePermiso } from "../roles/permisos.service.js";
import { solicitudPagoController } from "./solicitudPago.controller.js";
import {
  anularSolicitudSchema,
  createSolicitudSchema,
  entregaSolicitudSchema,
  facturaSolicitudSchema,
  pagarSolicitudSchema,
  updateSolicitudSchema,
} from "./solicitudPago.schema.js";

const RECURSO = "pagos.solicitudes";

// Cada firma tiene su permiso: quien revisa no es quien da el VºBº ni quien autoriza.
const PERMISO_POR_FIRMA: Record<string, string> = {
  REVISADO: "revisar",
  VISTO_BUENO: "visto_bueno",
  ADMINISTRADOR: "autorizar",
};

async function requirePermisoFirma(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ success: false, error: "Token requerido" });
  if (req.user.role === ROL_SUPERADMIN) return next();
  const accion = PERMISO_POR_FIRMA[String(req.params.tipo)];
  if (!accion) return res.status(400).json({ success: false, error: "Tipo de firma inválido" });
  const permisos = await obtenerPermisosUsuario(req.user.id);
  if (!tienePermiso(permisos, RECURSO, accion)) {
    return res.status(403).json({ success: false, error: "No tienes permiso para firmar este paso" });
  }
  next();
}

const router = Router();

router.use(authenticate);

// Consultas (antes de "/:id" para que no se tomen como un id)
router.get("/resumen", requirePermiso(RECURSO, "ver"), solicitudPagoController.getResumen);
router.get("/defaults", requirePermiso(RECURSO, "ver"), solicitudPagoController.getDefaults);
router.get("/beneficiarios", requirePermiso(RECURSO, "ver"), solicitudPagoController.getBeneficiarios);
router.get("/", requirePermiso(RECURSO, "ver"), solicitudPagoController.getAll);
router.get("/:id", requirePermiso(RECURSO, "ver"), solicitudPagoController.getById);

// Armar y modificar la solicitud
router.post("/", requirePermiso(RECURSO, "crear"), validate(createSolicitudSchema), solicitudPagoController.create);
router.put("/:id", requirePermiso(RECURSO, "editar"), validate(updateSolicitudSchema), solicitudPagoController.update);
router.patch("/:id/factura", requirePermiso(RECURSO, "editar"), validate(facturaSolicitudSchema), solicitudPagoController.factura);
router.patch("/:id/entrega", requirePermiso(RECURSO, "editar"), validate(entregaSolicitudSchema), solicitudPagoController.entrega);

// Firmas: Revisó, VºBº y Administración (quien elabora queda firmado al crear)
router.post("/:id/firmas/:tipo", requirePermisoFirma, solicitudPagoController.firmar);
router.delete("/:id/firmas/:tipo", requirePermisoFirma, solicitudPagoController.quitarFirma);

// Pago y anulación
router.post("/:id/pagar", requirePermiso(RECURSO, "pagar"), validate(pagarSolicitudSchema), solicitudPagoController.pagar);
router.delete("/:id/pago", requirePermiso(RECURSO, "pagar"), solicitudPagoController.revertirPago);
router.post("/:id/anular", requirePermiso(RECURSO, "anular"), validate(anularSolicitudSchema), solicitudPagoController.anular);

export default router;

import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { ambientalController } from "./ambiental.controller.js";

const router = Router();

router.use(authenticate);

// Roles que gestionan el módulo ambiental
const GESTORES = ["ADMIN", "SUPERINTENDENTE", "MEDIOAMBIENTE"] as const;

// ── Dashboard y mapa (lectura: cualquier autenticado) ────────────────────────
router.get("/dashboard", ambientalController.getDashboard);
router.get("/mapa",      ambientalController.getMapaAmbiental);

// ── Puntos de monitoreo ──────────────────────────────────────────────────────
router.get("/puntos",        ambientalController.getPuntos);
router.post("/puntos",       authorize(...GESTORES), ambientalController.createPunto);
router.patch("/puntos/:id",  authorize(...GESTORES), ambientalController.updatePunto);
router.delete("/puntos/:id", authorize("ADMIN"),     ambientalController.deletePunto);

// ── Recursos hídricos ────────────────────────────────────────────────────────
router.get("/hidrico",        authorize(...GESTORES), ambientalController.getRegistrosHidricos);
router.post("/hidrico",       authorize(...GESTORES), ambientalController.createRegistroHidrico);
router.delete("/hidrico/:id", authorize("ADMIN"),     ambientalController.deleteRegistroHidrico);

// ── Gestión de residuos ──────────────────────────────────────────────────────
router.get("/residuos",        authorize(...GESTORES), ambientalController.getRegistrosResiduo);
router.post("/residuos",       authorize(...GESTORES), ambientalController.createRegistroResiduo);
router.delete("/residuos/:id", authorize("ADMIN"),     ambientalController.deleteRegistroResiduo);

// ── Ruido y emisiones atmosféricas ───────────────────────────────────────────
router.get("/ruido",        authorize(...GESTORES), ambientalController.getRegistrosRuido);
router.post("/ruido",       authorize(...GESTORES), ambientalController.createRegistroRuido);
router.delete("/ruido/:id", authorize("ADMIN"),     ambientalController.deleteRegistroRuido);

// ── Suelos y biodiversidad ───────────────────────────────────────────────────
router.get("/suelo",        authorize(...GESTORES), ambientalController.getRegistrosSuelo);
router.post("/suelo",       authorize(...GESTORES), ambientalController.createRegistroSuelo);
router.delete("/suelo/:id", authorize("ADMIN"),     ambientalController.deleteRegistroSuelo);

// ── Pozos sépticos ───────────────────────────────────────────────────────────
router.get("/pozos",        ambientalController.getPozos);
router.post("/pozos",       authorize(...GESTORES), ambientalController.createPozo);
router.patch("/pozos/:id",  authorize(...GESTORES), ambientalController.updatePozo);
router.delete("/pozos/:id", authorize("ADMIN"),     ambientalController.deletePozo);

// ── Manifiesto ambiental ─────────────────────────────────────────────────────
router.get("/manifiestos",        ambientalController.getManifiestos);
router.post("/manifiestos",       authorize(...GESTORES), ambientalController.createManifiesto);
router.patch("/manifiestos/:id",  authorize(...GESTORES), ambientalController.updateManifiesto);
router.delete("/manifiestos/:id", authorize("ADMIN"),     ambientalController.deleteManifiesto);

export default router;

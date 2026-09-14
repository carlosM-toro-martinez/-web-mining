import { Router } from "express";
import productoRoutes from "../modules/producto/producto.routes.js";
import authRoutes from "../modules/auth/auth.routes.js";
import categoriaInventarioRoutes from "../modules/categoriaInventario/categoriaInventario.routes.js";
import contabilidadRoutes from "../modules/contabilidad/contabilidad.routes.js";
import movimientoRoutes from "../modules/movimiento/movimiento.routes.js";
import valesRoutes from "../modules/vales/vales.routes.js";
import comprasRoutes from "../modules/compras/compras.routes.js";
import proveedoresRoutes from "../modules/proveedores/proveedores.routes.js";
import reportesRoutes from "../modules/reportes/reportes.routes.js";
import employeeRoutes from "../modules/employee/employee.routes.js";
import biometricRoutes from "../modules/biometric/biometric.routes.js";
// iclock routes are mounted at root level in app.ts (ADMS protocol, not under /api)
import pedidosRoutes from "../modules/pedidos/pedidos.routes.js";
import inventarioImportRoutes from "../modules/inventarioImport/inventarioImport.routes.js";
import personalRoutes from "../modules/personal/personal.routes.js";
import eppRoutes from "../modules/epp/epp.routes.js";
import ambientalRoutes from "../modules/ambiental/ambiental.routes.js";
import backfillRoutes from "../modules/backfill/backfill.routes.js";
// Logística, Acopio y Liquidación Minera — Fase 1: catálogos parametrizables
import municipioOrigenRoutes from "../modules/municipioOrigen/municipioOrigen.routes.js";
import tipoMineralRoutes from "../modules/tipoMineral/tipoMineral.routes.js";
import ingenioRoutes from "../modules/ingenio/ingenio.routes.js";
import conceptoLiquidacionRoutes from "../modules/conceptoLiquidacion/conceptoLiquidacion.routes.js";
import alicuotaRegaliaRoutes from "../modules/alicuotaRegalia/alicuotaRegalia.routes.js";
import tarifaLiquidacionRoutes from "../modules/tarifaLiquidacion/tarifaLiquidacion.routes.js";
// Logística — Fase 2: remitente y flota
import remitenteRoutes from "../modules/remitente/remitente.routes.js";
import vehiculoRoutes from "../modules/vehiculo/vehiculo.routes.js";
import choferRoutes from "../modules/chofer/chofer.routes.js";
// Logística — Fase 3: núcleo de lotes de despacho
import loteDespachoRoutes from "../modules/loteDespacho/loteDespacho.routes.js";
// Logística — Fase 4: liquidaciones
import liquidacionRoutes from "../modules/liquidacion/liquidacion.routes.js";
// Logística — Fase 5: reportes y cierre mensual
import logisticaReportesRoutes from "../modules/logisticaReportes/logisticaReportes.routes.js";
// Caja Chica / Rendición de Cuentas de Campamento — Fase 1: catálogos
import cajaChicaRoutes from "../modules/cajaChica/cajaChica.routes.js";
import centroCostoCajaRoutes from "../modules/centroCostoCaja/centroCostoCaja.routes.js";
import funcionGastoCajaRoutes from "../modules/funcionGastoCaja/funcionGastoCaja.routes.js";
import cuentaContableCajaRoutes from "../modules/cuentaContableCaja/cuentaContableCaja.routes.js";
import conceptoRetencionCajaRoutes from "../modules/conceptoRetencionCaja/conceptoRetencionCaja.routes.js";
// Caja Chica — Fase 2: núcleo
import gastoCajaRoutes from "../modules/gastoCaja/gastoCaja.routes.js";
import movimientoFondoCajaRoutes from "../modules/movimientoFondoCaja/movimientoFondoCaja.routes.js";
// Caja Chica — Fase 3: rendiciones
import rendicionCajaRoutes from "../modules/rendicionCaja/rendicionCaja.routes.js";
// Caja Chica — Fase 4: reportes
import reportesCajaChicaRoutes from "../modules/reportesCajaChica/reportesCajaChica.routes.js";

const router = Router();

// Middleware para loggear que las rutas se están accediendo
router.use((req, res, next) => {
  console.log(`🛣️  Routes accessed: ${req.method} ${req.baseUrl}${req.path}`);
  next();
});

router.use("/auth", authRoutes);
router.use("/categorias-inventario", categoriaInventarioRoutes);
router.use("/productos", productoRoutes);
router.use("/contabilidad", contabilidadRoutes);
router.use("/", contabilidadRoutes);
router.use("/movimientos", movimientoRoutes);
router.use("/vales", valesRoutes);
router.use("/compras", comprasRoutes);
router.use("/proveedores", proveedoresRoutes);
router.use("/reportes", reportesRoutes);
router.use("/employees", employeeRoutes);
router.use("/biometric", biometricRoutes);
router.use("/pedidos", pedidosRoutes);
router.use("/inventario-import", inventarioImportRoutes);
router.use("/personal", personalRoutes);
router.use("/epp", eppRoutes);
router.use("/ambiental", ambientalRoutes);
router.use("/backfill", backfillRoutes);

// Logística, Acopio y Liquidación Minera — Fase 1
router.use("/municipios-origen", municipioOrigenRoutes);
router.use("/tipos-mineral", tipoMineralRoutes);
router.use("/ingenios", ingenioRoutes);
router.use("/conceptos-liquidacion", conceptoLiquidacionRoutes);
router.use("/alicuotas-regalia", alicuotaRegaliaRoutes);
router.use("/tarifas-liquidacion", tarifaLiquidacionRoutes);

// Logística, Acopio y Liquidación Minera — Fase 2
router.use("/remitentes", remitenteRoutes);
router.use("/vehiculos", vehiculoRoutes);
router.use("/choferes", choferRoutes);

// Logística, Acopio y Liquidación Minera — Fase 3
router.use("/lotes-despacho", loteDespachoRoutes);

// Logística, Acopio y Liquidación Minera — Fase 4
router.use("/liquidaciones", liquidacionRoutes);

// Logística, Acopio y Liquidación Minera — Fase 5
router.use("/logistica-reportes", logisticaReportesRoutes);

// Caja Chica / Rendición de Cuentas de Campamento — Fase 1
router.use("/cajas-chicas", cajaChicaRoutes);
router.use("/centros-costo-caja", centroCostoCajaRoutes);
router.use("/funciones-gasto-caja", funcionGastoCajaRoutes);
router.use("/cuentas-contables-caja", cuentaContableCajaRoutes);
router.use("/conceptos-retencion-caja", conceptoRetencionCajaRoutes);

// Caja Chica — Fase 2
router.use("/gastos-caja", gastoCajaRoutes);
router.use("/movimientos-fondo-caja", movimientoFondoCajaRoutes);

// Caja Chica — Fase 3
router.use("/rendiciones-caja", rendicionCajaRoutes);

// Caja Chica — Fase 4
router.use("/reportes-caja-chica", reportesCajaChicaRoutes);

export default router;

import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";
import { prisma } from "../../config/prisma.js";
import {
  importarCatalogo,
  cargarStockInicial,
  cargarStockInicialItem,
  buscarProductosAutocomplete,
  cargarSaldoMensual,
  getSaldosMensualesCargados,
  upsertSaldoMensualItem,
  getSaldoMensualById,
  updateSaldoMensualItem,
  deleteSaldoMensualItem,
  reiniciarStock,
  sincronizarStockDesdeSaldoMensual,
  recalcularStock,
  inicializarPeriodo,
  cerrarMes,
  getCierres,
  getPreviewPeriodo,
  recalcularPreciosProm,
  ajustarCamposSaldoMensual,
  ajustarTotalBsInicialDesdeExcel,
  ajusteProductosMes,
  ajustarPreciosSinIva,
  diagnosticarPrecios,
} from "./inventarioImport.service.js";
import {
  stockInicialSchema,
  stockInicialConProductoSchema,
  autocompleteQuerySchema,
  saldoMensualSchema,
  saldoMensualQuerySchema,
  saldoMensualItemSchema,
  saldoMensualIdParamSchema,
  updateSaldoMensualItemSchema,
  reiniciarStockSchema,
  sincronizarStockSchema,
  inicializarPeriodoSchema,
  cerrarMesSchema,
  ajusteCamposSaldoMensualSchema,
  ajusteInicialExcelQuerySchema,
  ajusteProductosMesSchema,
} from "./inventarioImport.schema.js";

export const inventarioImportController = {
  // ─── Catálogo Excel ──────────────────────────────────────────────────────

  async importarCatalogo(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: "Se requiere un archivo Excel" });
      }
      const anio = req.query.anio ? parseInt(String(req.query.anio)) : undefined;
      const mes  = req.query.mes  ? parseInt(String(req.query.mes))  : undefined;
      const opciones = anio && mes ? { anio, mes } : undefined;
      const result = await importarCatalogo(req.file.buffer, opciones);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  // ─── Autocomplete de productos ───────────────────────────────────────────

  async buscarProductos(req: AuthRequest, res: Response) {
    try {
      const parsed = autocompleteQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "Parámetros inválidos" });
      }
      const data = await buscarProductosAutocomplete(parsed.data.q ?? undefined, parsed.data.limit);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  // ─── Stock inicial ───────────────────────────────────────────────────────

  async cargarStockInicial(req: AuthRequest, res: Response) {
    try {
      const parsed = stockInicialSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "Datos inválidos", details: parsed.error.flatten() });
      }
      const result = await cargarStockInicial(parsed.data.items, req.user!.id);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  // ─── Saldo mensual – batch ───────────────────────────────────────────────

  async cargarSaldoMensual(req: AuthRequest, res: Response) {
    try {
      const parsed = saldoMensualSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "Datos inválidos", details: parsed.error.flatten() });
      }
      const result = await cargarSaldoMensual(parsed.data, req.user!.id);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getSaldosMensuales(req: AuthRequest, res: Response) {
    try {
      const parsed = saldoMensualQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "Parámetros inválidos. Se requieren anio y mes." });
      }
      const data = await getSaldosMensualesCargados(parsed.data.anio, parsed.data.mes);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  // ─── Saldo mensual – item individual ────────────────────────────────────

  async upsertSaldoMensualItem(req: AuthRequest, res: Response) {
    try {
      const parsed = saldoMensualItemSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "Datos inválidos", details: parsed.error.flatten() });
      }
      const data = await upsertSaldoMensualItem(parsed.data, req.user!.id);
      const status = data.accion === "creado" ? 201 : 200;
      res.status(status).json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getSaldoMensualById(req: AuthRequest, res: Response) {
    try {
      const parsed = saldoMensualIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "ID inválido" });
      }
      const data = await getSaldoMensualById(parsed.data.id);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async updateSaldoMensualItem(req: AuthRequest, res: Response) {
    try {
      const paramParsed = saldoMensualIdParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        return res.status(400).json({ success: false, error: "ID inválido" });
      }
      const bodyParsed = updateSaldoMensualItemSchema.safeParse(req.body);
      if (!bodyParsed.success) {
        return res.status(400).json({ success: false, error: "Datos inválidos", details: bodyParsed.error.flatten() });
      }
      const data = await updateSaldoMensualItem(paramParsed.data.id, bodyParsed.data, req.user!.id);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async deleteSaldoMensualItem(req: AuthRequest, res: Response) {
    try {
      const parsed = saldoMensualIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "ID inválido" });
      }
      const data = await deleteSaldoMensualItem(parsed.data.id, req.user!.id);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async cargarStockInicialItem(req: AuthRequest, res: Response) {
    try {
      const parsed = stockInicialConProductoSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "Datos inválidos", details: parsed.error.flatten() });
      }
      const data = await cargarStockInicialItem(parsed.data, req.user!.id);
      res.status(201).json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  // ─── Reiniciar stock ─────────────────────────────────────────────────────

  async reiniciarStock(req: AuthRequest, res: Response) {
    try {
      const parsed = reiniciarStockSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: 'Para confirmar envía { "confirmacion": "REINICIAR" }',
        });
      }
      const data = await reiniciarStock(req.user!.id);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  // ─── Sincronizar stock desde SaldoMensual ───────────────────────────────

  async sincronizarStock(req: AuthRequest, res: Response) {
    try {
      const parsed = sincronizarStockSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "Datos inválidos", details: parsed.error.flatten() });
      }
      const data = await sincronizarStockDesdeSaldoMensual(parsed.data, req.user!.id);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  // ─── Recalcular stock histórico ──────────────────────────────────────────

  async recalcularStock(req: AuthRequest, res: Response) {
    try {
      const { productoId, stockInicial, eliminarValeIds } = req.body ?? {};
      if (!productoId || stockInicial === undefined) {
        return res.status(400).json({ success: false, error: "productoId y stockInicial son requeridos" });
      }
      const data = await recalcularStock(
        { productoId: Number(productoId), stockInicial: Number(stockInicial), eliminarValeIds },
        req.user!.id,
      );
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getMovimientosProducto(req: AuthRequest, res: Response) {
    try {
      const productoId = parseInt(String(req.params.productoId));
      if (isNaN(productoId)) return res.status(400).json({ success: false, error: "productoId inválido" });
      const movimientos = await prisma.movimiento.findMany({
        where: { productoId },
        orderBy: { createdAt: "asc" },
        select: { id: true, tipo: true, cantidad: true, stockAntes: true, stockDespues: true, referencia: true, referenciaId: true, createdAt: true, esRetroactivo: true, periodoAnio: true, periodoMes: true },
      });
      res.json({ success: true, data: movimientos });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  // ─── Inicializar período ─────────────────────────────────────────────────────

  async inicializarPeriodo(req: AuthRequest, res: Response) {
    try {
      const parsed = inicializarPeriodoSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "Datos inválidos", details: parsed.error.flatten() });
      }
      const data = await inicializarPeriodo(parsed.data.anio, parsed.data.mes);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  // ─── Cierre de mes ───────────────────────────────────────────────────────────

  async cerrarMes(req: AuthRequest, res: Response) {
    try {
      const parsed = cerrarMesSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "Datos inválidos", details: parsed.error.flatten() });
      }
      const data = await cerrarMes(parsed.data.anio, parsed.data.mes, req.user!.id);
      res.status(201).json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getCierres(_req: AuthRequest, res: Response) {
    try {
      const data = await getCierres();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  async getPreviewPeriodo(req: AuthRequest, res: Response) {
    try {
      const parsed = saldoMensualQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "Se requieren anio y mes" });
      }
      const data = await getPreviewPeriodo(parsed.data.anio, parsed.data.mes);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  async recalcularPreciosProm(_req: AuthRequest, res: Response) {
    try {
      const result = await recalcularPreciosProm();
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  // ─── Ajuste masivo de totalBsInicial desde Excel ────────────────────────

  async ajustarTotalBsInicialExcel(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: "Se requiere un archivo Excel" });
      }
      const queryParsed = ajusteInicialExcelQuerySchema.safeParse(req.query);
      if (!queryParsed.success) {
        return res.status(400).json({ success: false, error: "Se requieren anio y mes en la URL (?anio=2025&mes=10)" });
      }
      const data = await ajustarTotalBsInicialDesdeExcel(
        req.file.buffer,
        queryParsed.data.anio,
        queryParsed.data.mes,
        req.user!.id,
      );
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  // ─── Ajuste de campos de SaldoMensual (ajuste-inicial y ajuste-total) ─────
  // Ambas rutas usan el mismo handler. Campos soportados:
  //   totalBs, totalBsProm, totalBsInicial, precioUnit, saldoInicial

  async ajustarTotalBsInicial(req: AuthRequest, res: Response) {
    try {
      const paramParsed = saldoMensualIdParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        return res.status(400).json({ success: false, error: "ID inválido" });
      }
      const bodyParsed = ajusteCamposSaldoMensualSchema.safeParse(req.body);
      if (!bodyParsed.success) {
        return res.status(400).json({ success: false, error: "Datos inválidos", details: bodyParsed.error.flatten() });
      }
      const data = await ajustarCamposSaldoMensual(paramParsed.data.id, bodyParsed.data, req.user!.id);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async ajustarTotalBs(req: AuthRequest, res: Response) {
    try {
      const paramParsed = saldoMensualIdParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        return res.status(400).json({ success: false, error: "ID inválido" });
      }
      const bodyParsed = ajusteCamposSaldoMensualSchema.safeParse(req.body);
      if (!bodyParsed.success) {
        return res.status(400).json({ success: false, error: "Datos inválidos", details: bodyParsed.error.flatten() });
      }
      const data = await ajustarCamposSaldoMensual(paramParsed.data.id, bodyParsed.data, req.user!.id);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  // ─── Ajuste masivo de SaldoMensual por mes ───────────────────────────────

  async ajusteProductosMes(req: AuthRequest, res: Response) {
    try {
      const parsed = ajusteProductosMesSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "Datos inválidos", details: parsed.error.flatten() });
      }
      const { anio, mes, productos } = parsed.data;
      const data = await ajusteProductosMes(anio, mes, productos as Parameters<typeof ajusteProductosMes>[2]);
      const hayErrores = data.some((r) => !r.ok);
      res.status(hayErrores ? 207 : 200).json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  // ─── Ajuste de precios sin IVA ────────────────────────────────────────────

  async ajustarPreciosSinIva(req: AuthRequest, res: Response) {
    try {
      const anio = parseInt(String(req.body?.anio ?? req.query?.anio));
      const mes  = parseInt(String(req.body?.mes  ?? req.query?.mes));
      if (isNaN(anio) || isNaN(mes) || mes < 1 || mes > 12) {
        return res.status(400).json({ success: false, error: "Se requieren anio y mes válidos" });
      }
      const data = await ajustarPreciosSinIva(anio, mes);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  // ─── Diagnóstico de precios ───────────────────────────────────────────────

  async diagnosticarPrecios(req: AuthRequest, res: Response) {
    try {
      const anio = parseInt(String(req.query?.anio));
      const mes  = parseInt(String(req.query?.mes));
      if (isNaN(anio) || isNaN(mes) || mes < 1 || mes > 12) {
        return res.status(400).json({ success: false, error: "Se requieren anio y mes válidos" });
      }
      const data = await diagnosticarPrecios(anio, mes);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },
};

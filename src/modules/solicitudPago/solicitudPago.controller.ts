import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";
import { solicitudPagoService } from "./solicitudPago.service.js";
import {
  beneficiarioQuerySchema,
  defaultsQuerySchema,
  solicitudQuerySchema,
  tipoFirmaParamSchema,
} from "./solicitudPago.schema.js";

// Mismo manejo de errores en todos los endpoints: los HttpError conservan su código;
// lo demás es un 400 en escrituras y un 500 en lecturas
function responder<T>(res: Response, accion: () => Promise<T>, opciones: { status?: number; lectura?: boolean } = {}) {
  return accion().then(
    (data) => res.status(opciones.status ?? 200).json({ success: true, data }),
    (error: unknown) => {
      const status = error instanceof HttpError ? error.statusCode : opciones.lectura ? 500 : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    },
  );
}

const idDe = (req: AuthRequest) => String(req.params.id);

export const solicitudPagoController = {
  create: (req: AuthRequest, res: Response) =>
    responder(res, () => solicitudPagoService.createSolicitud(req.body, req.user!.id), { status: 201 }),

  update: (req: AuthRequest, res: Response) =>
    responder(res, () => solicitudPagoService.updateSolicitud(idDe(req), req.body, req.user!.id)),

  async getAll(req: AuthRequest, res: Response) {
    try {
      // req.query es de solo lectura en Express 5: se vuelve a interpretar aquí
      const query = solicitudQuerySchema.parse(req.query);
      const result = await solicitudPagoService.getSolicitudes(query);
      res.json({ success: true, data: result.solicitudes, meta: result.meta });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  getById: (req: AuthRequest, res: Response) =>
    responder(res, () => solicitudPagoService.getSolicitudById(idDe(req)), { lectura: true }),

  async getResumen(req: AuthRequest, res: Response) {
    return responder(
      res,
      async () => {
        const { anio, mes } = solicitudQuerySchema.pick({ anio: true, mes: true }).parse(req.query);
        return solicitudPagoService.getResumen(anio, mes);
      },
      { lectura: true },
    );
  },

  getDefaults: (req: AuthRequest, res: Response) =>
    responder(
      res,
      async () => {
        const { anio, mes } = defaultsQuerySchema.parse(req.query);
        return solicitudPagoService.getDefaults(anio, mes);
      },
      { lectura: true },
    ),

  getBeneficiarios: (req: AuthRequest, res: Response) =>
    responder(
      res,
      async () => solicitudPagoService.getBeneficiarios(beneficiarioQuerySchema.parse(req.query).search || undefined),
      { lectura: true },
    ),

  factura: (req: AuthRequest, res: Response) =>
    responder(res, () => solicitudPagoService.registrarFactura(idDe(req), req.body, req.user!.id)),

  entrega: (req: AuthRequest, res: Response) =>
    responder(res, () => solicitudPagoService.registrarEntrega(idDe(req), req.body, req.user!.id)),

  pagar: (req: AuthRequest, res: Response) =>
    responder(res, () => solicitudPagoService.pagar(idDe(req), req.body, req.user!.id)),

  revertirPago: (req: AuthRequest, res: Response) =>
    responder(res, () => solicitudPagoService.revertirPago(idDe(req), req.user!.id)),

  anular: (req: AuthRequest, res: Response) =>
    responder(res, () => solicitudPagoService.anular(idDe(req), req.body, req.user!.id)),

  firmar: (req: AuthRequest, res: Response) =>
    responder(res, async () => {
      const { id, tipo } = tipoFirmaParamSchema.parse(req.params);
      return solicitudPagoService.firmar(id, tipo, req.user!.id);
    }),

  quitarFirma: (req: AuthRequest, res: Response) =>
    responder(res, async () => {
      const { id, tipo } = tipoFirmaParamSchema.parse(req.params);
      return solicitudPagoService.quitarFirma(id, tipo, req.user!.id);
    }),
};

import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import { EMPRESA_SOLICITUDES, TIPOS_FIRMA } from "./solicitudPago.schema.js";
import type {
  AnularSolicitudDTO,
  CreateSolicitudDTO,
  EntregaSolicitudDTO,
  FacturaSolicitudDTO,
  PagarSolicitudDTO,
  SolicitudQueryDTO,
  TipoFirma,
  UpdateSolicitudDTO,
} from "./solicitudPago.types.js";

const ETIQUETA_FIRMA: Record<TipoFirma, string> = {
  ELABORADO: "Elaboró",
  REVISADO: "Revisó",
  VISTO_BUENO: "VºBº",
  ADMINISTRADOR: "Administración",
};

const incluir = {
  items: { orderBy: { orden: "asc" } },
  firmas: true,
  proveedor: { select: { id: true, nombre: true } },
  compra: {
    select: {
      id: true,
      estado: true,
      tipoDocumento: true,
      numeroFactura: true,
      proveedor: { select: { nombre: true } },
    },
  },
} satisfies Prisma.SolicitudPagoInclude;

const ordenFirmas = (a: { tipo: string }, b: { tipo: string }) =>
  TIPOS_FIRMA.indexOf(a.tipo as TipoFirma) - TIPOS_FIRMA.indexOf(b.tipo as TipoFirma);

function conFirmasOrdenadas<T extends { firmas: Array<{ tipo: string }> }>(solicitud: T): T {
  return { ...solicitud, firmas: [...solicitud.firmas].sort(ordenFirmas) };
}

function anioMes(fecha: Date) {
  return { anio: fecha.getUTCFullYear(), mes: fecha.getUTCMonth() + 1 };
}

function prepararItems(items: CreateSolicitudDTO["items"]) {
  return items.map((item, indice) => {
    const total = new Prisma.Decimal(item.cantidad).mul(item.precioUnit).sub(item.descuento).toDecimalPlaces(2);
    if (total.isNegative()) {
      throw new HttpError(`El descuento del ítem ${indice + 1} supera su valor`, 400);
    }
    return {
      orden: indice + 1,
      referencia: item.referencia?.trim() || null,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precioUnit: item.precioUnit,
      descuento: item.descuento,
      total,
    };
  });
}

const sumar = (items: Array<{ total: Prisma.Decimal }>) =>
  items.reduce((suma, item) => suma.add(item.total), new Prisma.Decimal(0)).toDecimalPlaces(2);

async function validarVinculos(proveedorId?: number | null, compraId?: string | null) {
  if (proveedorId) {
    const proveedor = await prisma.proveedor.findUnique({ where: { id: proveedorId }, select: { id: true } });
    if (!proveedor) throw new HttpError("Proveedor no encontrado", 404);
  }
  if (compraId) {
    const compra = await prisma.compra.findUnique({ where: { id: compraId }, select: { id: true } });
    if (!compra) throw new HttpError("Pedido de compra no encontrado", 404);
  }
}

async function obtener(id: string) {
  const solicitud = await prisma.solicitudPago.findUnique({ where: { id }, include: incluir });
  if (!solicitud) throw new HttpError("Solicitud de pago no encontrada", 404);
  return solicitud;
}

async function registrar(userId: number, accion: string, data: Prisma.InputJsonValue) {
  await prisma.log.create({ data: { usuarioId: userId, accion, data } });
}

function todasFirmadas(firmas: Array<{ tipo: string; firmadoAt: Date | null }>) {
  return TIPOS_FIRMA.every((tipo) => firmas.some((f) => f.tipo === tipo && f.firmadoAt !== null));
}

export const solicitudPagoService = {
  // Datos que se repiten de una solicitud a la siguiente: quién solicita y los nombres de las firmas
  async getDefaults(anio: number, mes: number) {
    const max = await prisma.solicitudPago.aggregate({
      where: { empresa: EMPRESA_SOLICITUDES, anio, mes },
      _max: { numero: true },
    });
    const ultima = await prisma.solicitudPago.findFirst({
      where: { empresa: EMPRESA_SOLICITUDES },
      orderBy: { createdAt: "desc" },
      select: { solicitadoPor: true, firmas: { select: { tipo: true, nombre: true, cargo: true } } },
    });
    const firmas: Record<string, { nombre: string; cargo: string | null }> = {};
    for (const firma of ultima?.firmas ?? []) firmas[firma.tipo] = { nombre: firma.nombre, cargo: firma.cargo };
    return {
      siguienteNumero: (max._max.numero ?? 0) + 1,
      solicitadoPor: ultima?.solicitadoPor ?? "",
      firmas,
    };
  },

  async createSolicitud(data: CreateSolicitudDTO, userId: number) {
    await validarVinculos(data.proveedorId, data.compraId);
    const items = prepararItems(data.items);
    const total = sumar(items);
    const { anio, mes } = anioMes(data.fecha);

    const usuario = await prisma.user.findUnique({ where: { id: userId }, select: { nombre: true } });
    const defaults = await this.getDefaults(anio, mes);
    const ahora = new Date();
    const firmas = TIPOS_FIRMA.map((tipo) => {
      const propia = data.firmas?.[tipo];
      const previa = defaults.firmas[tipo];
      return {
        tipo,
        nombre: propia?.nombre || previa?.nombre || (tipo === "ELABORADO" ? (usuario?.nombre ?? "") : ""),
        cargo: propia?.cargo ?? previa?.cargo ?? null,
        // Quien arma la solicitud queda registrado como "Elaboró" en el mismo acto
        ...(tipo === "ELABORADO" ? { usuarioId: userId, usuarioNombre: usuario?.nombre ?? null, firmadoAt: ahora } : {}),
      };
    });

    const maxIntentos = data.numero ? 1 : 5;
    for (let intento = 1; intento <= maxIntentos; intento += 1) {
      try {
        const creada = await prisma.$transaction(async (tx) => {
          let numero = data.numero;
          if (!numero) {
            const max = await tx.solicitudPago.aggregate({
              where: { empresa: EMPRESA_SOLICITUDES, anio, mes },
              _max: { numero: true },
            });
            numero = (max._max.numero ?? 0) + 1;
          }
          return tx.solicitudPago.create({
            data: {
              empresa: EMPRESA_SOLICITUDES,
              anio,
              mes,
              numero,
              fecha: data.fecha,
              solicitadoPor: data.solicitadoPor || defaults.solicitadoPor,
              cotizacion: data.cotizacion || null,
              informeUso: data.informeUso || null,
              observaciones: data.observaciones || null,
              total,
              proveedorId: data.proveedorId ?? null,
              compraId: data.compraId ?? null,
              beneficiarioNombre: data.beneficiarioNombre,
              beneficiarioNit: data.beneficiarioNit || null,
              banco: data.banco || null,
              cuenta: data.cuenta || null,
              tipoDocumento: data.tipoDocumento ?? null,
              numeroFactura: data.tipoDocumento && data.tipoDocumento !== "SIN_DOCUMENTO" ? data.numeroFactura || null : null,
              documentoRegistradoAt: data.tipoDocumento ? ahora : null,
              estadoEntrega: data.estadoEntrega ?? "PENDIENTE",
              notaEntrega: data.notaEntrega || null,
              creadoPorId: userId,
              items: { create: items },
              firmas: { create: firmas },
            },
            include: incluir,
          });
        });
        await registrar(userId, "CREATE_SOLICITUD_PAGO", { solicitudId: creada.id, numero: creada.numero, anio, mes, total: Number(total) });
        logger.info({ userId, solicitudId: creada.id, action: "CREATE_SOLICITUD_PAGO" }, "Solicitud de pago creada");
        return conFirmasOrdenadas(creada);
      } catch (error) {
        const repetido = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
        if (!repetido) throw error;
        if (data.numero) {
          throw new HttpError(`Ya existe la solicitud Nº ${data.numero} de ${mes}/${anio}`, 409);
        }
        if (intento === maxIntentos) throw new HttpError("No se pudo asignar el número de la solicitud, intenta de nuevo", 409);
      }
    }
    throw new HttpError("No se pudo crear la solicitud", 500);
  },

  async updateSolicitud(id: string, data: UpdateSolicitudDTO, userId: number) {
    const actual = await obtener(id);
    if (actual.estado === "PAGADA" || actual.estado === "ANULADA") {
      throw new HttpError(
        actual.estado === "PAGADA"
          ? "La solicitud ya está pagada: no se puede modificar su contenido"
          : "La solicitud está anulada: no se puede modificar",
        409,
      );
    }
    await validarVinculos(data.proveedorId, data.compraId);
    const items = prepararItems(data.items);
    const total = sumar(items);
    const { anio, mes } = anioMes(data.fecha);

    const actualizada = await prisma.$transaction(async (tx) => {
      let numero = actual.numero;
      if (anio !== actual.anio || mes !== actual.mes) {
        // Cambió de mes: toma el siguiente número del mes nuevo
        const max = await tx.solicitudPago.aggregate({
          where: { empresa: actual.empresa, anio, mes },
          _max: { numero: true },
        });
        numero = (max._max.numero ?? 0) + 1;
      }

      await tx.solicitudPagoItem.deleteMany({ where: { solicitudId: id } });
      const volvioABorrador = actual.estado === "SOLICITADA";
      // Si el contenido cambia, las firmas de revisión ya no corresponden: se vuelven a pedir
      await tx.solicitudPagoFirma.updateMany({
        where: { solicitudId: id, tipo: { in: ["REVISADO", "VISTO_BUENO", "ADMINISTRADOR"] } },
        data: { usuarioId: null, usuarioNombre: null, firmadoAt: null },
      });
      for (const tipo of TIPOS_FIRMA) {
        const texto = data.firmas?.[tipo];
        if (texto) {
          await tx.solicitudPagoFirma.update({
            where: { solicitudId_tipo: { solicitudId: id, tipo } },
            data: { nombre: texto.nombre, cargo: texto.cargo ?? null },
          });
        }
      }

      return tx.solicitudPago.update({
        where: { id },
        data: {
          anio,
          mes,
          numero,
          fecha: data.fecha,
          solicitadoPor: data.solicitadoPor,
          cotizacion: data.cotizacion || null,
          informeUso: data.informeUso || null,
          observaciones: data.observaciones || null,
          total,
          proveedorId: data.proveedorId ?? null,
          compraId: data.compraId ?? null,
          beneficiarioNombre: data.beneficiarioNombre,
          beneficiarioNit: data.beneficiarioNit || null,
          banco: data.banco || null,
          cuenta: data.cuenta || null,
          ...(data.tipoDocumento !== undefined
            ? {
                tipoDocumento: data.tipoDocumento ?? null,
                numeroFactura: data.tipoDocumento && data.tipoDocumento !== "SIN_DOCUMENTO" ? data.numeroFactura || null : null,
              }
            : {}),
          ...(data.estadoEntrega ? { estadoEntrega: data.estadoEntrega } : {}),
          ...(data.notaEntrega !== undefined ? { notaEntrega: data.notaEntrega || null } : {}),
          ...(volvioABorrador ? { estado: "BORRADOR" as const } : {}),
          items: { create: items },
        },
        include: incluir,
      });
    });

    await registrar(userId, "UPDATE_SOLICITUD_PAGO", { solicitudId: id, numero: actualizada.numero, total: Number(total) });
    return conFirmasOrdenadas(actualizada);
  },

  async getSolicitudes(query: SolicitudQueryDTO) {
    const where: Prisma.SolicitudPagoWhereInput = { empresa: EMPRESA_SOLICITUDES };
    const and: Prisma.SolicitudPagoWhereInput[] = [];
    if (query.anio) where.anio = query.anio;
    if (query.mes) where.mes = query.mes;
    if (query.estado) where.estado = query.estado;
    if (query.entrega) where.estadoEntrega = query.entrega;
    if (query.factura === "PENDIENTE") and.push({ tipoDocumento: null, estado: { not: "ANULADA" } });
    else if (query.factura) where.tipoDocumento = query.factura;
    if (query.busqueda) {
      const texto = { contains: query.busqueda, mode: "insensitive" as const };
      const numero = Number(query.busqueda);
      and.push({
        OR: [
          { beneficiarioNombre: texto },
          { beneficiarioNit: texto },
          { numeroFactura: texto },
          { cotizacion: texto },
          { informeUso: texto },
          { items: { some: { descripcion: texto } } },
          ...(Number.isInteger(numero) ? [{ numero }] : []),
        ],
      });
    }
    if (and.length) where.AND = and;

    const orderBy: Prisma.SolicitudPagoOrderByWithRelationInput[] =
      query.anio && query.mes ? [{ numero: "asc" }] : [{ fecha: "desc" }, { numero: "desc" }];

    if (query.sinPaginar) {
      const solicitudes = await prisma.solicitudPago.findMany({ where, orderBy, include: incluir });
      return { solicitudes: solicitudes.map(conFirmasOrdenadas), meta: { total: solicitudes.length } };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const [solicitudes, total] = await Promise.all([
      prisma.solicitudPago.findMany({ where, orderBy, include: incluir, skip: (page - 1) * limit, take: limit }),
      prisma.solicitudPago.count({ where }),
    ]);
    return {
      solicitudes: solicitudes.map(conFirmasOrdenadas),
      meta: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
    };
  },

  async getSolicitudById(id: string) {
    return conFirmasOrdenadas(await obtener(id));
  },

  // Contadores del tablero del mes: cuántas hay en cada estado y cuánto dinero representan
  async getResumen(anio?: number, mes?: number) {
    const where: Prisma.SolicitudPagoWhereInput = { empresa: EMPRESA_SOLICITUDES };
    if (anio) where.anio = anio;
    if (mes) where.mes = mes;
    const [porEstado, pagadasSinDocumento, entregaPendiente] = await Promise.all([
      prisma.solicitudPago.groupBy({ by: ["estado"], where, _count: { _all: true }, _sum: { total: true } }),
      prisma.solicitudPago.count({ where: { ...where, estado: "PAGADA", tipoDocumento: null } }),
      prisma.solicitudPago.count({ where: { ...where, estado: "PAGADA", estadoEntrega: { not: "COMPLETADO" } } }),
    ]);
    const estados = { BORRADOR: 0, SOLICITADA: 0, PAGADA: 0, ANULADA: 0 };
    const montos = { BORRADOR: 0, SOLICITADA: 0, PAGADA: 0, ANULADA: 0 };
    for (const fila of porEstado) {
      estados[fila.estado] = fila._count._all;
      montos[fila.estado] = Number(fila._sum.total ?? 0);
    }
    return {
      total: estados.BORRADOR + estados.SOLICITADA + estados.PAGADA + estados.ANULADA,
      estados,
      montos,
      // Ya se pagaron y todavía no tienen factura ni recibo registrado
      pagadasSinDocumento,
      // Ya se pagaron y lo comprado todavía no llegó o la obra no terminó
      pagadasPorEntregar: entregaPendiente,
    };
  },

  // Beneficiarios para autocompletar: primero los de solicitudes anteriores (traen banco y cuenta)
  // y después los proveedores del sistema
  async getBeneficiarios(search?: string) {
    const texto = search ? { contains: search, mode: "insensitive" as const } : undefined;
    const previas = await prisma.solicitudPago.findMany({
      where: {
        empresa: EMPRESA_SOLICITUDES,
        ...(texto ? { OR: [{ beneficiarioNombre: texto }, { beneficiarioNit: texto }] } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: { beneficiarioNombre: true, beneficiarioNit: true, banco: true, cuenta: true, proveedorId: true },
      take: 300,
    });
    const claves = new Set<string>();
    const clave = (nombre: string, nit?: string | null) => (nit ? `nit:${nit.replace(/\D/g, "")}` : `nom:${nombre.trim().toLowerCase()}`);
    const lista: Array<{ nombre: string; nit: string | null; banco: string | null; cuenta: string | null; proveedorId: number | null; origen: "solicitud" | "proveedor" }> = [];
    for (const fila of previas) {
      const k = clave(fila.beneficiarioNombre, fila.beneficiarioNit);
      if (claves.has(k)) continue;
      claves.add(k);
      lista.push({
        nombre: fila.beneficiarioNombre,
        nit: fila.beneficiarioNit,
        banco: fila.banco,
        cuenta: fila.cuenta,
        proveedorId: fila.proveedorId,
        origen: "solicitud",
      });
    }
    const proveedores = await prisma.proveedor.findMany({
      where: texto ? { OR: [{ nombre: texto }, { nit: texto }, { razonSocial: texto }] } : {},
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, nit: true },
      take: 40,
    });
    for (const proveedor of proveedores) {
      const k = clave(proveedor.nombre, proveedor.nit);
      if (claves.has(k) || claves.has(`nom:${proveedor.nombre.trim().toLowerCase()}`)) continue;
      claves.add(k);
      lista.push({ nombre: proveedor.nombre, nit: proveedor.nit, banco: null, cuenta: null, proveedorId: proveedor.id, origen: "proveedor" });
    }
    return lista.slice(0, 30);
  },

  async firmar(id: string, tipo: Exclude<TipoFirma, "ELABORADO">, userId: number) {
    const solicitud = await obtener(id);
    if (solicitud.estado === "PAGADA" || solicitud.estado === "ANULADA") {
      throw new HttpError("La solicitud ya no admite firmas", 409);
    }
    const firma = solicitud.firmas.find((f) => f.tipo === tipo);
    if (firma?.firmadoAt) throw new HttpError(`Ya tiene la firma de ${ETIQUETA_FIRMA[tipo]}`, 409);

    const anterior = TIPOS_FIRMA[TIPOS_FIRMA.indexOf(tipo) - 1]!;
    if (!solicitud.firmas.some((f) => f.tipo === anterior && f.firmadoAt)) {
      throw new HttpError(`Primero debe firmar ${ETIQUETA_FIRMA[anterior]}`, 409);
    }

    const usuario = await prisma.user.findUnique({ where: { id: userId }, select: { nombre: true } });
    const ahora = new Date();
    await prisma.solicitudPagoFirma.upsert({
      where: { solicitudId_tipo: { solicitudId: id, tipo } },
      update: { usuarioId: userId, usuarioNombre: usuario?.nombre ?? null, firmadoAt: ahora, ...(firma?.nombre ? {} : { nombre: usuario?.nombre ?? "" }) },
      create: { solicitudId: id, tipo, nombre: usuario?.nombre ?? "", usuarioId: userId, usuarioNombre: usuario?.nombre ?? null, firmadoAt: ahora },
    });

    const firmas = solicitud.firmas.map((f) => (f.tipo === tipo ? { ...f, firmadoAt: ahora } : f));
    if (todasFirmadas(firmas) && solicitud.estado === "BORRADOR") {
      await prisma.solicitudPago.update({ where: { id }, data: { estado: "SOLICITADA" } });
    }
    await registrar(userId, "FIRMAR_SOLICITUD_PAGO", { solicitudId: id, tipo });
    return conFirmasOrdenadas(await obtener(id));
  },

  // Quitar una firma también quita las que dependen de ella (las siguientes)
  async quitarFirma(id: string, tipo: Exclude<TipoFirma, "ELABORADO">, userId: number) {
    const solicitud = await obtener(id);
    if (solicitud.estado === "PAGADA" || solicitud.estado === "ANULADA") {
      throw new HttpError("La solicitud ya no admite cambios en las firmas", 409);
    }
    const desde = TIPOS_FIRMA.indexOf(tipo);
    await prisma.solicitudPagoFirma.updateMany({
      where: { solicitudId: id, tipo: { in: TIPOS_FIRMA.slice(desde) as unknown as TipoFirma[] } },
      data: { usuarioId: null, usuarioNombre: null, firmadoAt: null },
    });
    if (solicitud.estado === "SOLICITADA") {
      await prisma.solicitudPago.update({ where: { id }, data: { estado: "BORRADOR" } });
    }
    await registrar(userId, "QUITAR_FIRMA_SOLICITUD_PAGO", { solicitudId: id, tipo });
    return conFirmasOrdenadas(await obtener(id));
  },

  async registrarFactura(id: string, data: FacturaSolicitudDTO, userId: number) {
    const solicitud = await obtener(id);
    if (solicitud.estado === "ANULADA") throw new HttpError("La solicitud está anulada", 409);
    const numero = data.tipoDocumento && data.tipoDocumento !== "SIN_DOCUMENTO" ? data.numeroFactura?.trim() || null : null;
    await prisma.solicitudPago.update({
      where: { id },
      data: { tipoDocumento: data.tipoDocumento, numeroFactura: numero, documentoRegistradoAt: data.tipoDocumento ? new Date() : null },
    });
    await registrar(userId, "FACTURA_SOLICITUD_PAGO", {
      solicitudId: id,
      antes: { tipoDocumento: solicitud.tipoDocumento, numeroFactura: solicitud.numeroFactura },
      despues: { tipoDocumento: data.tipoDocumento, numeroFactura: numero },
    });
    return conFirmasOrdenadas(await obtener(id));
  },

  async registrarEntrega(id: string, data: EntregaSolicitudDTO, userId: number) {
    const solicitud = await obtener(id);
    if (solicitud.estado === "ANULADA") throw new HttpError("La solicitud está anulada", 409);
    await prisma.solicitudPago.update({
      where: { id },
      data: { estadoEntrega: data.estadoEntrega, notaEntrega: data.notaEntrega || null },
    });
    await registrar(userId, "ENTREGA_SOLICITUD_PAGO", { solicitudId: id, estadoEntrega: data.estadoEntrega, nota: data.notaEntrega ?? null });
    return conFirmasOrdenadas(await obtener(id));
  },

  async pagar(id: string, data: PagarSolicitudDTO, userId: number) {
    const solicitud = await obtener(id);
    if (solicitud.estado === "PAGADA") throw new HttpError("La solicitud ya está pagada", 409);
    if (solicitud.estado === "ANULADA") throw new HttpError("La solicitud está anulada", 409);
    await prisma.solicitudPago.update({
      where: { id },
      data: {
        estado: "PAGADA",
        fechaPago: data.fechaPago,
        referenciaPago: data.referenciaPago || null,
        pagadoPorId: userId,
        pagadoAt: new Date(),
      },
    });
    await registrar(userId, "PAGAR_SOLICITUD_PAGO", { solicitudId: id, numero: solicitud.numero, total: Number(solicitud.total) });
    return conFirmasOrdenadas(await obtener(id));
  },

  async revertirPago(id: string, userId: number) {
    const solicitud = await obtener(id);
    if (solicitud.estado !== "PAGADA") throw new HttpError("La solicitud no está pagada", 409);
    await prisma.solicitudPago.update({
      where: { id },
      data: {
        estado: todasFirmadas(solicitud.firmas) ? "SOLICITADA" : "BORRADOR",
        fechaPago: null,
        referenciaPago: null,
        pagadoPorId: null,
        pagadoAt: null,
      },
    });
    await registrar(userId, "REVERTIR_PAGO_SOLICITUD_PAGO", { solicitudId: id });
    return conFirmasOrdenadas(await obtener(id));
  },

  async anular(id: string, data: AnularSolicitudDTO, userId: number) {
    const solicitud = await obtener(id);
    if (solicitud.estado === "ANULADA") throw new HttpError("La solicitud ya está anulada", 409);
    await prisma.solicitudPago.update({
      where: { id },
      data: { estado: "ANULADA", motivoAnulacion: data.motivo, anuladoPorId: userId, anuladoAt: new Date() },
    });
    await registrar(userId, "ANULAR_SOLICITUD_PAGO", { solicitudId: id, numero: solicitud.numero, motivo: data.motivo, estabaPagada: solicitud.estado === "PAGADA" });
    return conFirmasOrdenadas(await obtener(id));
  },
};

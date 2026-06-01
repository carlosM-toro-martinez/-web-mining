import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../errors/http.error.js";
import type { AusenciaTipo } from "@prisma/client";

// ─── Tipos internos ───────────────────────────────────────────────────────────

type DiasSemana = "lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "sabado" | "domingo";

// ─── Helpers de tiempo ────────────────────────────────────────────────────────

// Convierte "HH:MM" a minutos desde medianoche
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

// Valida formato "HH:MM"
function validarHora(h: string): boolean {
  return /^\d{2}:\d{2}$/.test(h) && toMinutes(h) < 24 * 60;
}

// Día de semana (0=domingo) → nombre en español
function diaSemana(date: Date): DiasSemana {
  const DIAS: DiasSemana[] = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  return DIAS[date.getUTCDay()]!;
}

// Verifica si el horario aplica al día dado
function esLaborable(horario: Record<string, unknown>, dia: DiasSemana): boolean {
  return Boolean(horario[dia]);
}

// Minutos de retraso respecto al horario (negativo = llegó antes)
function calcularRetraso(llegada: Date, horaEntrada: string, tolerancia: number): number {
  const llegadaMin = llegada.getUTCHours() * 60 + llegada.getUTCMinutes();
  const programadoMin = toMinutes(horaEntrada);
  return llegadaMin - programadoMin - tolerancia;
}

// Inicio del día UTC para una fecha
function inicioDelDia(fecha: Date): Date {
  const d = new Date(fecha);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// ─── HORARIOS — CRUD ──────────────────────────────────────────────────────────

export async function crearHorario(data: {
  nombre: string;
  descripcion?: string;
  horaEntrada: string;
  horaSalida: string;
  tolerancia?: number;
  lunes?: boolean; martes?: boolean; miercoles?: boolean;
  jueves?: boolean; viernes?: boolean; sabado?: boolean; domingo?: boolean;
}) {
  if (!validarHora(data.horaEntrada)) throw new HttpError("horaEntrada inválida (HH:MM)", 400);
  if (!validarHora(data.horaSalida))  throw new HttpError("horaSalida inválida (HH:MM)", 400);
  if (toMinutes(data.horaEntrada) >= toMinutes(data.horaSalida))
    throw new HttpError("horaEntrada debe ser anterior a horaSalida", 400);

  return prisma.horario.create({ data: {
    nombre:      data.nombre,
    descripcion: data.descripcion ?? null,
    horaEntrada: data.horaEntrada,
    horaSalida:  data.horaSalida,
    tolerancia:  data.tolerancia ?? 15,
    lunes:    data.lunes    ?? true,
    martes:   data.martes   ?? true,
    miercoles:data.miercoles?? true,
    jueves:   data.jueves   ?? true,
    viernes:  data.viernes  ?? true,
    sabado:   data.sabado   ?? false,
    domingo:  data.domingo  ?? false,
  }});
}

export async function listarHorarios() {
  return prisma.horario.findMany({
    orderBy: { nombre: "asc" },
    include: { _count: { select: { asignaciones: { where: { hasta: null } } } } },
  });
}

export async function obtenerHorario(id: number) {
  const h = await prisma.horario.findUnique({ where: { id }, include: {
    asignaciones: {
      where: { hasta: null },
      include: { employee: { select: { id: true, nombre: true, cargo: true } } },
    },
  }});
  if (!h) throw new HttpError("Horario no encontrado", 404);
  return h;
}

export async function actualizarHorario(id: number, data: Partial<{
  nombre: string; descripcion: string; horaEntrada: string; horaSalida: string;
  tolerancia: number; lunes: boolean; martes: boolean; miercoles: boolean;
  jueves: boolean; viernes: boolean; sabado: boolean; domingo: boolean; activo: boolean;
}>) {
  const existe = await prisma.horario.findUnique({ where: { id } });
  if (!existe) throw new HttpError("Horario no encontrado", 404);

  if (data.horaEntrada && !validarHora(data.horaEntrada))
    throw new HttpError("horaEntrada inválida (HH:MM)", 400);
  if (data.horaSalida && !validarHora(data.horaSalida))
    throw new HttpError("horaSalida inválida (HH:MM)", 400);

  const entrada = data.horaEntrada ?? existe.horaEntrada;
  const salida  = data.horaSalida  ?? existe.horaSalida;
  if (toMinutes(entrada) >= toMinutes(salida))
    throw new HttpError("horaEntrada debe ser anterior a horaSalida", 400);

  return prisma.horario.update({ where: { id }, data });
}

export async function eliminarHorario(id: number) {
  const asignados = await prisma.empleadoHorario.count({ where: { horarioId: id, hasta: null } });
  if (asignados > 0)
    throw new HttpError(`No se puede eliminar: ${asignados} empleado(s) usan este horario actualmente`, 409);
  await prisma.horario.delete({ where: { id } });
}

// ─── ASIGNACIONES — ligar empleado a horario ──────────────────────────────────

export async function asignarHorario(employeeId: number, horarioId: number, desde: Date) {
  const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!emp) throw new HttpError("Empleado no encontrado", 404);

  const hor = await prisma.horario.findUnique({ where: { id: horarioId } });
  if (!hor) throw new HttpError("Horario no encontrado", 404);

  // Cerrar asignación vigente anterior
  await prisma.empleadoHorario.updateMany({
    where: { employeeId, hasta: null },
    data:  { hasta: desde },
  });

  return prisma.empleadoHorario.create({
    data: { employeeId, horarioId, desde },
    include: { horario: true },
  });
}

export async function horarioActualEmpleado(employeeId: number) {
  const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!emp) throw new HttpError("Empleado no encontrado", 404);

  return prisma.empleadoHorario.findFirst({
    where:   { employeeId, hasta: null },
    include: { horario: true },
    orderBy: { desde: "desc" },
  });
}

export async function historialHorariosEmpleado(employeeId: number) {
  const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!emp) throw new HttpError("Empleado no encontrado", 404);

  return prisma.empleadoHorario.findMany({
    where:   { employeeId },
    include: { horario: true },
    orderBy: { desde: "desc" },
  });
}

export async function eliminarAsignacion(id: number) {
  const a = await prisma.empleadoHorario.findUnique({ where: { id } });
  if (!a) throw new HttpError("Asignación no encontrada", 404);
  await prisma.empleadoHorario.delete({ where: { id } });
}

// ─── AUSENCIAS ────────────────────────────────────────────────────────────────

export async function crearAusencia(data: {
  employeeId: number;
  tipo: AusenciaTipo;
  desde: Date;
  hasta: Date;
  motivo?: string;
  aprobado?: boolean;
  creadoPor?: string;
}) {
  const emp = await prisma.employee.findUnique({ where: { id: data.employeeId } });
  if (!emp) throw new HttpError("Empleado no encontrado", 404);
  if (data.desde > data.hasta) throw new HttpError("'desde' debe ser anterior o igual a 'hasta'", 400);

  return prisma.ausenciaEmpleado.create({
    data: {
      employeeId: data.employeeId,
      tipo:       data.tipo,
      desde:      inicioDelDia(data.desde),
      hasta:      inicioDelDia(data.hasta),
      motivo:     data.motivo    ?? null,
      aprobado:   data.aprobado  ?? false,
      creadoPor:  data.creadoPor ?? null,
    },
    include: { employee: { select: { id: true, nombre: true, cargo: true } } },
  });
}

export async function listarAusencias(filtros: {
  employeeId?: number;
  tipo?: AusenciaTipo;
  desde?: Date;
  hasta?: Date;
  aprobado?: boolean;
  page?: number;
  limit?: number;
}) {
  const page  = filtros.page  ?? 1;
  const limit = filtros.limit ?? 50;

  const where: Record<string, unknown> = {};
  if (filtros.employeeId !== undefined) where["employeeId"] = filtros.employeeId;
  if (filtros.tipo)     where["tipo"]     = filtros.tipo;
  if (filtros.aprobado !== undefined) where["aprobado"] = filtros.aprobado;
  if (filtros.desde || filtros.hasta) {
    where["OR"] = [
      { desde: { lte: filtros.hasta ?? new Date("2099-12-31") }, hasta: { gte: filtros.desde ?? new Date("2000-01-01") } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.ausenciaEmpleado.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { desde: "desc" },
      include: { employee: { select: { id: true, nombre: true, cargo: true } } },
    }),
    prisma.ausenciaEmpleado.count({ where }),
  ]);

  return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function actualizarAusencia(id: number, data: Partial<{
  tipo: AusenciaTipo; desde: Date; hasta: Date; motivo: string; aprobado: boolean; creadoPor: string;
}>) {
  const existe = await prisma.ausenciaEmpleado.findUnique({ where: { id } });
  if (!existe) throw new HttpError("Ausencia no encontrada", 404);

  const desde = data.desde ? inicioDelDia(data.desde) : undefined;
  const hasta  = data.hasta  ? inicioDelDia(data.hasta)  : undefined;
  if (desde && hasta && desde > hasta) throw new HttpError("'desde' debe ser anterior o igual a 'hasta'", 400);

  return prisma.ausenciaEmpleado.update({
    where: { id },
    data:  { ...data, ...(desde ? { desde } : {}), ...(hasta ? { hasta } : {}) },
    include: { employee: { select: { id: true, nombre: true, cargo: true } } },
  });
}

export async function eliminarAusencia(id: number) {
  const existe = await prisma.ausenciaEmpleado.findUnique({ where: { id } });
  if (!existe) throw new HttpError("Ausencia no encontrada", 404);
  await prisma.ausenciaEmpleado.delete({ where: { id } });
}

// ─── REPORTE DE ASISTENCIA ────────────────────────────────────────────────────

type EstadoDia =
  | "PUNTUAL" | "TARDE" | "AUSENTE" | "SIN_HORARIO"
  | "NO_LABORAL" | "VACACION" | "DESCANSO"
  | "PERMISO" | "ENFERMEDAD" | "FERIADO" | "OTRO";

export async function generarReporte(desde: Date, hasta: Date, employeeId?: number) {
  const desdeInicio = inicioDelDia(desde);
  const hastaFin    = new Date(inicioDelDia(hasta).getTime() + 86399999);

  // 1. Empleados con sus asignaciones de horario para el período
  const empleados = await prisma.employee.findMany({
    where: { activo: true, ...(employeeId ? { id: employeeId } : {}) },
    orderBy: { nombre: "asc" },
    include: {
      horarios: {
        where: {
          desde: { lte: hastaFin },
          OR: [{ hasta: null }, { hasta: { gte: desdeInicio } }],
        },
        include: { horario: true },
        orderBy: { desde: "desc" },
      },
    },
  });

  // 2. Marcas del período
  const logs = await prisma.asistenciaLog.findMany({
    where: {
      fecha: { gte: desdeInicio, lte: hastaFin },
      ...(employeeId ? { employeeId } : { employeeId: { not: null } }),
    },
    orderBy: { fecha: "asc" },
  });

  // 3. Ausencias del período
  const ausencias = await prisma.ausenciaEmpleado.findMany({
    where: {
      desde: { lte: hastaFin },
      hasta: { gte: desdeInicio },
      ...(employeeId ? { employeeId } : {}),
    },
  });

  // Agrupar logs por employeeId → fecha (YYYY-MM-DD) → tipo → primera/última marca
  const logsByEmp = new Map<number, Map<string, { entradas: Date[]; salidas: Date[] }>>();
  for (const log of logs) {
    if (!log.employeeId) continue;
    if (!logsByEmp.has(log.employeeId)) logsByEmp.set(log.employeeId, new Map());
    const byDate = logsByEmp.get(log.employeeId)!;
    const key = log.fecha.toISOString().slice(0, 10);
    if (!byDate.has(key)) byDate.set(key, { entradas: [], salidas: [] });
    const entry = byDate.get(key)!;
    if (log.tipo === "ENTRADA") entry.entradas.push(log.fecha);
    else if (log.tipo === "SALIDA") entry.salidas.push(log.fecha);
  }

  // Agrupar ausencias por employeeId
  const ausenciasByEmp = new Map<number, typeof ausencias>();
  for (const a of ausencias) {
    if (!ausenciasByEmp.has(a.employeeId)) ausenciasByEmp.set(a.employeeId, []);
    ausenciasByEmp.get(a.employeeId)!.push(a);
  }

  // 4. Iterar días del período
  const resultados = [];

  for (const emp of empleados) {
    const dias = [];
    const resumen: Record<string, number> = {
      puntual: 0, tarde: 0, ausente: 0,
      vacacion: 0, descanso: 0, permiso: 0, enfermedad: 0, feriado: 0, otro: 0,
      noLaboral: 0, sinHorario: 0,
    };

    const empLogs    = logsByEmp.get(emp.id)    ?? new Map();
    const empAusencias = ausenciasByEmp.get(emp.id) ?? [];

    // Horario vigente para cada día (último asignado antes de ese día)
    function horarioParaDia(dia: Date) {
      for (const asig of emp.horarios) {
        const desde = asig.desde;
        const hasta  = asig.hasta;
        if (desde <= dia && (hasta === null || hasta >= dia)) return asig.horario;
      }
      return null;
    }

    // Ausencia que cubre un día dado
    function ausenciaDelDia(dia: Date) {
      const diaStr = dia.toISOString().slice(0, 10);
      return empAusencias.find((a) => {
        const d = a.desde.toISOString().slice(0, 10);
        const h = a.hasta.toISOString().slice(0, 10);
        return d <= diaStr && diaStr <= h;
      }) ?? null;
    }

    // Iterar día a día
    const cursor = new Date(desdeInicio);
    while (cursor <= hastaFin) {
      const diaStr  = cursor.toISOString().slice(0, 10);
      const horario = horarioParaDia(new Date(cursor));
      const dia     = diaSemana(cursor);

      let estado: EstadoDia;
      let minutosRetraso = 0;
      let entradaReal: string | null = null;
      let salidaReal:  string | null = null;
      let ausencia: { tipo: AusenciaTipo; motivo: string | null; aprobado: boolean } | null = null;

      if (!horario) {
        estado = "SIN_HORARIO";
        resumen["sinHorario"]!++;
      } else if (!esLaborable(horario as Record<string, unknown>, dia)) {
        estado = "NO_LABORAL";
        resumen["noLaboral"]!++;
      } else {
        const aus = ausenciaDelDia(cursor);
        if (aus) {
          estado = aus.tipo.toLowerCase() as EstadoDia;
          ausencia = { tipo: aus.tipo, motivo: aus.motivo, aprobado: aus.aprobado };
          const key = aus.tipo.toLowerCase();
          resumen[key] = (resumen[key] ?? 0) + 1;
        } else {
          const marcas = empLogs.get(diaStr);
          if (!marcas || marcas.entradas.length === 0) {
            estado = "AUSENTE";
            resumen["ausente"]!++;
          } else {
            const primeraEntrada = marcas.entradas.reduce((a, b) => (a < b ? a : b));
            const ultimaSalida   = marcas.salidas.length > 0
              ? marcas.salidas.reduce((a, b) => (a > b ? a : b))
              : null;

            const retraso = calcularRetraso(primeraEntrada, horario.horaEntrada, horario.tolerancia);
            minutosRetraso = Math.max(0, retraso);

            const hh = (d: Date) =>
              `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;

            entradaReal = hh(primeraEntrada);
            salidaReal  = ultimaSalida ? hh(ultimaSalida) : null;

            if (retraso > 0) {
              estado = "TARDE";
              resumen["tarde"]!++;
            } else {
              estado = "PUNTUAL";
              resumen["puntual"]!++;
            }
          }
        }
      }

      dias.push({
        fecha: diaStr,
        diaSemana: dia,
        estado,
        programado: horario ? { entrada: horario.horaEntrada, salida: horario.horaSalida } : null,
        real: (entradaReal || salidaReal) ? { entrada: entradaReal, salida: salidaReal } : null,
        minutosRetraso,
        ausencia,
      });

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    resultados.push({
      empleado: { id: emp.id, nombre: emp.nombre, cargo: emp.cargo ?? null },
      horarioActual: emp.horarios[0]?.horario
        ? { nombre: emp.horarios[0].horario.nombre, entrada: emp.horarios[0].horario.horaEntrada, salida: emp.horarios[0].horario.horaSalida }
        : null,
      dias,
      resumen,
    });
  }

  return {
    periodo: {
      desde: desdeInicio.toISOString().slice(0, 10),
      hasta: hastaFin.toISOString().slice(0, 10),
    },
    empleados: resultados,
  };
}

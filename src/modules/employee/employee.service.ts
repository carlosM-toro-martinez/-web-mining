import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  EmployeeResponse,
  EmployeeQuery,
} from "./employee.types.js";

const ZK_IP = process.env.ZK_IP ?? "";

// ─── helpers ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toResponse(emp: any): EmployeeResponse {
  return {
    id: emp.id,
    nombre: emp.nombre,
    documento: emp.documento,
    cargo: emp.cargo ?? null,
    tipoPersonal: emp.tipoPersonal ?? "OBRERO",
    deviceUserId: emp.deviceUserId,
    activo: emp.activo,
    syncStatus: emp.syncStatus as EmployeeResponse["syncStatus"],
    createdAt: emp.createdAt,
    updatedAt: emp.updatedAt,
  };
}

async function nextDeviceUserId(): Promise<string> {
  const last = await prisma.employee.findFirst({
    orderBy: { id: "desc" },
    select: { id: true },
  });
  return String((last?.id ?? 0) + 1);
}

async function queueCommand(
  action: "CREATE" | "UPDATE" | "DELETE",
  deviceUserId: string,
  nombre?: string,
): Promise<void> {
  await prisma.syncQueue.create({
    data: {
      action,
      payload: action === "DELETE" ? { pin: deviceUserId } : { pin: deviceUserId, name: nombre ?? "" },
      status: "PENDING",
      deviceIp: ZK_IP,
    },
  });
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createEmployee(data: CreateEmployeeInput): Promise<EmployeeResponse> {
  const deviceUserId = data.deviceUserId ?? (await nextDeviceUserId());

  const exists = await prisma.employee.findUnique({
    where: { deviceUserId },
    select: { id: true },
  });
  if (exists) throw new HttpError(`Ya existe un empleado con deviceUserId "${deviceUserId}"`, 409);

  if (data.documento) {
    const docExists = await prisma.employee.findUnique({
      where: { documento: data.documento },
      select: { id: true },
    });
    if (docExists) throw new HttpError(`Ya existe un empleado con documento "${data.documento}"`, 409);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const employee = await (prisma.employee.create as any)({
    data: {
      nombre: data.nombre,
      documento: data.documento ?? null,
      cargo: data.cargo ?? null,
      tipoPersonal: data.tipoPersonal ?? "OBRERO",
      deviceUserId,
      syncStatus: "PENDING",
    },
  });

  // Queue ADMS command — device will pick it up on next poll
  await queueCommand("CREATE", employee.deviceUserId, employee.nombre);
  logger.info({ id: employee.id, deviceUserId }, "Empleado creado, comando ADMS encolado");

  return toResponse(employee);
}

export async function getAllEmployees(query: EmployeeQuery): Promise<{
  empleados: EmployeeResponse[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 50;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (query.search) {
    where["OR"] = [
      { nombre: { contains: query.search, mode: "insensitive" } },
      { documento: { contains: query.search, mode: "insensitive" } },
      { cargo: { contains: query.search, mode: "insensitive" } },
    ];
  }
  if (query.activo !== undefined) {
    where["activo"] = query.activo;
  }
  if (query.tipoPersonal !== undefined) {
    where["tipoPersonal"] = query.tipoPersonal;
  }

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      skip,
      take: limit,
      orderBy: { nombre: "asc" },
    }),
    prisma.employee.count({ where }),
  ]);

  return {
    empleados: employees.map(toResponse),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function getEmployeeById(id: number): Promise<EmployeeResponse> {
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) throw new HttpError("Empleado no encontrado", 404);
  return toResponse(employee);
}

export async function updateEmployee(
  id: number,
  data: UpdateEmployeeInput,
): Promise<EmployeeResponse> {
  const existing = await prisma.employee.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new HttpError("Empleado no encontrado", 404);

  if (data.documento) {
    const docExists = await prisma.employee.findFirst({
      where: { documento: data.documento, id: { not: id } },
      select: { id: true },
    });
    if (docExists) throw new HttpError(`Ya existe otro empleado con documento "${data.documento}"`, 409);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const employee = await (prisma.employee.update as any)({
    where: { id },
    data: {
      ...(data.nombre !== undefined && { nombre: data.nombre }),
      ...(data.documento !== undefined && { documento: data.documento }),
      ...(data.cargo !== undefined && { cargo: data.cargo }),
      ...(data.tipoPersonal !== undefined && { tipoPersonal: data.tipoPersonal }),
      ...(data.activo !== undefined && { activo: data.activo }),
    },
  });

  // If name changed, queue UPDATE command so the device reflects the new name
  if (data.nombre) {
    await queueCommand("UPDATE", employee.deviceUserId, employee.nombre);
  }

  logger.info({ id }, "Empleado actualizado");
  return toResponse(employee);
}

export async function deleteEmployee(id: number): Promise<void> {
  const employee = await prisma.employee.findUnique({
    where: { id },
    select: { id: true, deviceUserId: true },
  });
  if (!employee) throw new HttpError("Empleado no encontrado", 404);

  // Queue DELETE command before removing from DB
  await queueCommand("DELETE", employee.deviceUserId);

  // Preserve attendance history by unlinking the employee reference
  await prisma.asistenciaLog.updateMany({
    where: { employeeId: id },
    data: { employeeId: null },
  });

  await prisma.employee.delete({ where: { id } });
  logger.info({ id }, "Empleado eliminado, comando ADMS encolado");
}

export async function syncPendingEmployees(): Promise<{ sincronizados: number; pendientes: number }> {
  const pending = await prisma.employee.findMany({
    where: { syncStatus: "PENDING", activo: true },
    select: { id: true, nombre: true, deviceUserId: true },
  });

  for (const emp of pending) {
    await queueCommand("CREATE", emp.deviceUserId, emp.nombre);
  }

  logger.info({ encolados: pending.length }, "Re-encolados empleados pendientes para ADMS");
  return { sincronizados: pending.length, pendientes: pending.length };
}

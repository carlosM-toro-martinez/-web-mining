import { PrismaClient, SyncAction } from "@prisma/client";
import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  EmployeeResponse,
} from "./employee.types.js";

const prisma = new PrismaClient();

export class EmployeeService {
  async createEmployee(data: CreateEmployeeInput): Promise<EmployeeResponse> {
    const employee = await prisma.employee.create({
      data: {
        nombre: data.nombre,
        documento: data.documento ?? null,
        deviceUserId: data.deviceUserId,
      },
    });

    // Insertar en SyncQueue
    await prisma.syncQueue.create({
      data: {
        action: SyncAction.CREATE,
        payload: {
          deviceUserId: data.deviceUserId,
          nombre: data.nombre,
        },
        deviceIp: "192.168.137.201", // IP del dispositivo biométrico
      },
    });

    return {
      id: employee.id,
      nombre: employee.nombre,
      documento: employee.documento,
      deviceUserId: employee.deviceUserId,
      activo: employee.activo,
      syncStatus: employee.syncStatus,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
    };
  }

  async getAllEmployees(): Promise<EmployeeResponse[]> {
    const employees = await prisma.employee.findMany();
    return employees.map((emp) => ({
      id: emp.id,
      nombre: emp.nombre,
      documento: emp.documento,
      deviceUserId: emp.deviceUserId,
      activo: emp.activo,
      syncStatus: emp.syncStatus,
      createdAt: emp.createdAt,
      updatedAt: emp.updatedAt,
    }));
  }

  async getEmployeeById(id: number): Promise<EmployeeResponse | null> {
    const employee = await prisma.employee.findUnique({
      where: { id },
    });
    if (!employee) return null;
    return {
      id: employee.id,
      nombre: employee.nombre,
      documento: employee.documento,
      deviceUserId: employee.deviceUserId,
      activo: employee.activo,
      syncStatus: employee.syncStatus,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
    };
  }

  async updateEmployee(id: number, data: UpdateEmployeeInput): Promise<EmployeeResponse | null> {
    try {
      const employee = await prisma.employee.update({
        where: { id },
        data,
      });
      return {
        id: employee.id,
        nombre: employee.nombre,
        documento: employee.documento,
        deviceUserId: employee.deviceUserId,
        activo: employee.activo,
        syncStatus: employee.syncStatus,
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt,
      };
    } catch {
      return null;
    }
  }

  async deleteEmployee(id: number): Promise<boolean> {
    try {
      await prisma.employee.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }
}

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma.js";
import type { LoginDTO, RegisterDTO } from "./auth.types.js";
import { logger } from "../../config/logger.js";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

export const authService = {
  async register(data: RegisterDTO) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        nombre: data.nombre,
        email: data.email,
        password: hashedPassword,
        role: data.role,
      },
      select: { id: true, nombre: true, email: true, role: true },
    });

    logger.info({ userId: user.id, action: "USER_REGISTERED" }, "Nuevo usuario registrado");

    return user;
  },

  async login(data: LoginDTO) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user || !(await bcrypt.compare(data.password, user.password))) {
      logger.warn({ email: data.email }, "Intento de login fallido");
      throw new Error("Credenciales inválidas");
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "1h" });

    logger.info({ userId: user.id }, "Usuario logueado exitosamente");

    return {
      token,
      user: { id: user.id, nombre: user.nombre, email: user.email, role: user.role },
    };
  },
};

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import type {
  LoginDTO,
  RegisterDTO,
  ForgotPasswordDTO,
  ResetPasswordDTO,
  ChangePasswordDTO,
} from "./auth.types.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "refresh_secret";

// Tiempos de expiración
const ACCESS_TOKEN_EXPIRY = "3h"; // 3 horas
const REFRESH_TOKEN_EXPIRY = "7d"; // 7 días
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 días en ms

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const authService = {
  async register(data: RegisterDTO) {
    console.log("🔄 AUTH SERVICE: register called with:", data);

    const hashedPassword = await bcrypt.hash(data.password, 10);
    console.log("🔐 Password hashed successfully");

    try {
      console.log("💾 Creating user in database...");
      const user = await prisma.user.create({
        data: {
          nombre: data.nombre,
          email: data.email,
          password: hashedPassword,
          role: data.role,
        },
        select: { id: true, nombre: true, email: true, role: true },
      });

      console.log("✅ User created successfully:", user);
      logger.info({ userId: user.id, action: "USER_REGISTERED" }, "Nuevo usuario registrado");

      return user;
    } catch (unknownError) {
      const error = unknownError instanceof Error ? unknownError : new Error("Unknown error");

      console.log("❌ DATABASE ERROR:", error.message);
      logger.error(
        { error: error.message, stack: error.stack, email: data.email, role: data.role },
        "Error al crear usuario",
      );

      if (
        unknownError instanceof Prisma.PrismaClientKnownRequestError &&
        unknownError.code === "P2002"
      ) {
        throw new HttpError("Email ya registrado", 409, {
          target: (unknownError.meta as { target?: string[] }).target,
        });
      }
      throw new HttpError("Error interno al crear usuario", 500, {
        originalMessage: error.message,
      });
    }
  },

  async login(data: LoginDTO) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user || !(await bcrypt.compare(data.password, user.password))) {
      logger.warn({ email: data.email }, "Intento de login fallido");
      throw new HttpError("Credenciales inválidas", 401);
    }

    // Generar access token (corta duración)
    const accessToken = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    // Generar refresh token (larga duración)
    const refreshToken = jwt.sign({ id: user.id }, REFRESH_TOKEN_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    // Guardar refresh token en la base de datos
    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken,
        refreshTokenExpiry: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    });

    logger.info({ userId: user.id }, "Usuario logueado exitosamente");

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, nombre: user.nombre, email: user.email, role: user.role },
    };
  },

  async forgotPassword(data: ForgotPasswordDTO) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      throw new HttpError("Usuario no encontrado", 404);
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}?token=${resetToken}`;

    // Siempre loggear el token para desarrollo/debugging
    console.log(`🔑 RESET TOKEN PARA ${user.email}: ${resetToken}`);
    console.log(`🔗 RESET URL: ${resetUrl}`);

    // Enviar email si hay configuración SMTP
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: user.email,
        subject: "Recuperación de contraseña - Minera Marte",
        html: `<p>Hola ${user.nombre},</p><p>Haz clic en el enlace para resetear tu contraseña: <a href="${resetUrl}">${resetUrl}</a></p><p>Este enlace expira en 10 minutos.</p>`,
      });
    } else {
      console.log("⚠️  SMTP no configurado: email no enviado, usa el token de arriba");
    }

    logger.info({ userId: user.id }, "Token de recuperación enviado");

    return { message: "Correo de recuperación enviado" };
  },

  async resetPassword(data: ResetPasswordDTO) {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: data.token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new HttpError("Token inválido o expirado", 400);
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    logger.info({ userId: user.id }, "Contraseña reseteada");

    return { message: "Contraseña actualizada exitosamente" };
  },

  async changePassword(userId: number, data: ChangePasswordDTO) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(data.currentPassword, user.password))) {
      throw new HttpError("Contraseña actual incorrecta", 400);
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    logger.info({ userId }, "Contraseña cambiada");

    return { message: "Contraseña cambiada exitosamente" };
  },

  async refresh(refreshToken: string) {
    try {
      // Validar el refresh token
      const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as { id: number };

      // Buscar el usuario y verificar que el token coincida
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          role: true,
          nombre: true,
          email: true,
          refreshToken: true,
          refreshTokenExpiry: true,
        },
      });

      if (!user || user.refreshToken !== refreshToken) {
        throw new HttpError("Refresh token inválido o revocado", 401);
      }

      if (!user.refreshTokenExpiry || user.refreshTokenExpiry < new Date()) {
        throw new HttpError("Refresh token expirado", 401);
      }

      // Generar nuevo access token
      const newAccessToken = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
      });

      logger.info({ userId: user.id }, "Access token renovado");

      return {
        accessToken: newAccessToken,
        user: { id: user.id, nombre: user.nombre, email: user.email, role: user.role },
      };
    } catch (error) {
      if (error instanceof HttpError) throw error;
      logger.warn({ error: (error as Error).message }, "Error en refresh token");
      throw new HttpError("Refresh token inválido", 401);
    }
  },

  async logout(userId: number) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken: null,
        refreshTokenExpiry: null,
      },
    });

    logger.info({ userId }, "Usuario deslogueado");

    return { message: "Logout exitoso" };
  },
};

import { prisma } from "./config/prisma.js";
import bcrypt from "bcrypt";

async function seed() {
  try {
    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email: "carlostoro@gmail.com" },
    });

    if (existingUser) {
      console.log("Usuario admin ya existe.");
      return;
    }

    // Crear usuario admin con datos desde ENV (o valores por defecto)
    const adminEmail = process.env.ADMIN_EMAIL || "carlostoro@gmail.com";
    const adminPlainPassword = process.env.ADMIN_PASSWORD || "pass123";

    const hashedPassword = await bcrypt.hash(adminPlainPassword, 10);
    const adminUser = await prisma.user.create({
      data: {
        nombre: process.env.ADMIN_NAME || "carlos toro",
        email: adminEmail,
        password: hashedPassword,
        role: "ADMIN",
      },
    });

    console.log("Usuario admin creado:", adminUser);
  } catch (error) {
    console.error("Error al crear usuario admin:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();

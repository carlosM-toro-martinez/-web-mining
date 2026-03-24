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

    // Crear usuario admin
    const hashedPassword = await bcrypt.hash("encuentraSS2026", 10);
    const adminUser = await prisma.user.create({
      data: {
        nombre: "carlos toro",
        email: "carlostoro@gmail.com",
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

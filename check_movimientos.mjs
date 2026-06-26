import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const startOfMonth = new Date(Date.UTC(2025, 9, 1));  // Oct 2025
const endOfMonth   = new Date(Date.UTC(2025, 10, 1)); // Nov 2025

const movs = await prisma.movimiento.findMany({
  where: {
    tipo: 'ENTRADA',
    OR: [
      { periodoAnio: 2025, periodoMes: 10 },
      { periodoAnio: null, createdAt: { gte: startOfMonth, lt: endOfMonth } },
    ],
  },
  select: {
    id: true,
    productoId: true,
    cantidad: true,
    precioUnit: true,
    entradaBs: true,
    periodoAnio: true,
    periodoMes: true,
    createdAt: true,
    referencia: true,
    producto: { select: { codigo: true, nombre: true } },
  },
  orderBy: { producto: { codigo: 'asc' } },
  take: 20,
});

console.log(`Movimientos ENTRADA Oct/2025: ${movs.length}`);
movs.forEach(m => {
  console.log(`  ${m.producto.codigo} | qty:${m.cantidad} | precioUnit:${m.precioUnit} | entradaBs:${m.entradaBs} | ref:${m.referencia} | periodo:${m.periodoAnio}/${m.periodoMes}`);
});

await prisma.$disconnect();

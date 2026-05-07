import('./src/config/prisma.ts').then(async ({prisma}) => {
  try {
    const start = new Date('2026-04-13T00:00:00.000Z');
    const end = new Date('2026-04-14T23:59:59.999Z');
    const rows = await prisma.movimiento.findMany({
      where: { createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });
    console.log('count', rows.length);
    rows.forEach(r => console.log(r.id, r.createdAt.toISOString()));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
});

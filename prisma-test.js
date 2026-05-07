import('./src/config/prisma.js').then(({ prisma }) => {
  const start = new Date('2026-04-13T00:00:00.000Z');
  const end = new Date('2026-04-14T23:59:59.999Z');
  return prisma.movimiento.findMany({
    where: { createdAt: { gte: start, lte: end } },
    orderBy: { createdAt: 'asc' },
    take: 10,
  }).then((rows) => {
    console.log('count', rows.length);
    rows.forEach((r) => console.log(r.id, r.createdAt.toISOString()));
    return prisma.$disconnect();
  }).catch((e) => {
    console.error(e);
    return prisma.$disconnect();
  });
});

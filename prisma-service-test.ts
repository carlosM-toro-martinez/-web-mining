import { reportesService } from './src/modules/reportes/reportes.service.ts';
import { prisma } from './src/config/prisma.ts';

const query = {
  page: 1,
  limit: 50,
  fechaInicio: new Date('2026-04-13T00:00:00.000Z'),
  fechaFin: new Date('2026-04-14T00:00:00.000Z'),
  fecha: undefined,
};

(async () => {
  try {
    const result = await reportesService.getBinCard(query as any);
    console.log('result count', result.items.length);
    if (result.items.length > 0) {
      console.log(result.items[0]);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();

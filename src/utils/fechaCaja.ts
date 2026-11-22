import { z } from "zod";

// Fecha de un movimiento de caja/banco: rechaza años absurdos (un "2006" por
// "2026" dejó remesas fuera de todos los rangos y rompió los saldos).
export const fechaCajaSchema = z.coerce.date().refine(
  (d) => {
    const anio = d.getUTCFullYear();
    return anio >= 2020 && anio <= new Date().getUTCFullYear() + 1;
  },
  { message: "La fecha tiene un año fuera de rango; revisa el año" },
);

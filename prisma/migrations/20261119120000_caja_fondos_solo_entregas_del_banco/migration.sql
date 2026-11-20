-- Un ingreso a la cuenta bancaria no es dinero de la caja: la caja recibe dinero
-- cuando el banco se lo entrega (salida del banco a la caja). Se eliminan los
-- fondos de caja que se habían copiado automáticamente desde ingresos del
-- banco vinculados a una remesa. (Los cuadres que los referenciaban quedan
-- con la referencia en NULL por la clave foránea ON DELETE SET NULL.)
DELETE FROM "MovimientoFondoCaja" WHERE "movimientoBancoId" IS NOT NULL;

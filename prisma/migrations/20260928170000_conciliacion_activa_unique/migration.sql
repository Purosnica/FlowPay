-- Endurecimiento de conciliación bancaria activa.
-- Las claves nullable permiten conservar el historial desconciliado y, al mismo tiempo,
-- impedir que una línea o un pago tengan dos conciliaciones activas concurrentes.

ALTER TABLE tbl_conciliacion_pago
  ADD COLUMN lineaActiva INT NULL,
  ADD COLUMN pagoActivo INT NULL;

UPDATE tbl_conciliacion_pago
SET
  lineaActiva = CASE WHEN estado = 'CONCILIADO' THEN idlinea ELSE NULL END,
  pagoActivo = CASE WHEN estado = 'CONCILIADO' THEN idpago ELSE NULL END;

CREATE UNIQUE INDEX uq_tbl_conciliacion_pago_lineaActiva
  ON tbl_conciliacion_pago(lineaActiva);

CREATE UNIQUE INDEX uq_tbl_conciliacion_pago_pagoActivo
  ON tbl_conciliacion_pago(pagoActivo);

-- H13: integridad liquidacion_detalle (FK + unique idpago).
-- Dedup: conserva el detalle más antiguo por idpago.

DELETE d
FROM tbl_liquidacion_detalle d
INNER JOIN (
  SELECT idpago, MIN(iddetalle) AS keep_id
  FROM tbl_liquidacion_detalle
  GROUP BY idpago
  HAVING COUNT(*) > 1
) x ON d.idpago = x.idpago AND d.iddetalle <> x.keep_id;

-- Eliminar huérfanos sin pago/préstamo
DELETE d FROM tbl_liquidacion_detalle d
LEFT JOIN tbl_pago p ON p.idpago = d.idpago
WHERE p.idpago IS NULL;

DELETE d FROM tbl_liquidacion_detalle d
LEFT JOIN tbl_prestamo pr ON pr.idprestamo = d.idprestamo
WHERE pr.idprestamo IS NULL;

ALTER TABLE `tbl_liquidacion_detalle`
  ADD CONSTRAINT `tbl_liquidacion_detalle_idpago_fkey`
    FOREIGN KEY (`idpago`) REFERENCES `tbl_pago`(`idpago`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `tbl_liquidacion_detalle_idprestamo_fkey`
    FOREIGN KEY (`idprestamo`) REFERENCES `tbl_prestamo`(`idprestamo`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX `tbl_liquidacion_detalle_idpago_key`
  ON `tbl_liquidacion_detalle`(`idpago`);

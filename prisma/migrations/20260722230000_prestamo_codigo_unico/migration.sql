-- H29: codigoUnico único por mandante + prep uploads multi-instancia (docs/env).

-- Dedupe: conservar el menor idprestamo; sufijar el resto.
UPDATE `tbl_prestamo` p
JOIN (
  SELECT `idmandante`, `codigoUnico`, MIN(`idprestamo`) AS `keep_id`
  FROM `tbl_prestamo`
  WHERE `deletedAt` IS NULL
  GROUP BY `idmandante`, `codigoUnico`
  HAVING COUNT(*) > 1
) d
  ON p.`idmandante` = d.`idmandante`
 AND p.`codigoUnico` = d.`codigoUnico`
 AND p.`idprestamo` <> d.`keep_id`
SET p.`codigoUnico` = CONCAT(p.`codigoUnico`, '-dup-', p.`idprestamo`)
WHERE p.`deletedAt` IS NULL;

ALTER TABLE `tbl_prestamo`
  ADD UNIQUE INDEX `tbl_prestamo_idmandante_codigoUnico_key` (`idmandante`, `codigoUnico`);

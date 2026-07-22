-- I054 webhooks HMAC mandante + I059 idempotency imports
ALTER TABLE `tbl_mandante`
  ADD COLUMN `webhookUrl` VARCHAR(500) NULL,
  ADD COLUMN `webhookSecret` VARCHAR(128) NULL,
  ADD COLUMN `webhookActivo` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `tbl_importacion_job`
  ADD COLUMN `idempotencyKey` VARCHAR(64) NULL;

CREATE UNIQUE INDEX `tbl_importacion_job_idusuario_idempotencyKey_key`
  ON `tbl_importacion_job` (`idusuario`, `idempotencyKey`);

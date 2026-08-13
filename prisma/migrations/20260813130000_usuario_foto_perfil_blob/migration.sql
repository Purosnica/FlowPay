-- La foto de perfil se almacena directamente en MySQL, sin filesystem externo.
ALTER TABLE `tbl_usuario`
  DROP COLUMN `fotoPerfil`,
  ADD COLUMN `fotoPerfilBlob` LONGBLOB NULL AFTER `telefono`,
  ADD COLUMN `fotoPerfilMime` VARCHAR(50) NULL AFTER `fotoPerfilBlob`;

-- Foto de perfil opcional. El archivo se almacena en el volumen persistente;
-- esta columna conserva únicamente su nombre seguro.
ALTER TABLE `tbl_usuario`
  ADD COLUMN `fotoPerfil` VARCHAR(191) NULL AFTER `telefono`;

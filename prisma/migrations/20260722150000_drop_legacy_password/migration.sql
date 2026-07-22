-- I016: eliminar columna password legacy (SHA-256). Todos los usuarios activos ya usan bcrypt.
ALTER TABLE `tbl_usuario` DROP COLUMN `password`;
